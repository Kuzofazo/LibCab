/**
 * Driver Wallet Service
 * Handles atomic wallet operations: create, credit, deduct, refund, adjust, and eligibility validation.
 * Features dual-layer persistence: PostgreSQL database when reachable, with seamless fallback
 * to persisted local file storage (driver-wallets.json) and in-memory ledger.
 * Includes circuit-breaker architecture to prevent connection timeouts when DB is paused or unreachable.
 */

import { prisma } from "@/lib/db";
import fs from "fs";
import path from "path";

// ─── File Storage Constants ──────────────────────────────────────────────────

const WALLETS_FILE_PATH = path.join(process.cwd(), "src", "data", "driver-wallets.json");

// ─── Circuit Breaker for DB Availability ─────────────────────────────────────

let dbAvailable = true;
let lastDbFailure = 0;
const DB_RETRY_INTERVAL_MS = 60000; // Retry DB once every 60s if offline

function isDbOnline(): boolean {
    if (!dbAvailable && Date.now() - lastDbFailure < DB_RETRY_INTERVAL_MS) {
        return false;
    }
    return true;
}

function markDbFailed() {
    dbAvailable = false;
    lastDbFailure = Date.now();
}

function markDbSuccess() {
    dbAvailable = true;
}

// ─── Default Configurations ──────────────────────────────────────────────────

const DEFAULT_MIN_BALANCE = 500;   // LRD
const DEFAULT_DEPOSIT_AMOUNT = 200; // LRD (when FIXED mode)
const DEFAULT_DEPOSIT_PERCENT = 10; // % of fare (when PERCENT mode)
const DEFAULT_DEPOSIT_MODE = "FIXED";

export interface WalletConfig {
    minBalance: number;
    depositAmount: number;
    depositPercent: number;
    depositMode: "FIXED" | "PERCENT";
}

export interface WalletEligibility {
    eligible: boolean;
    balance: number;
    minBalance: number;
    shortfall: number;
    walletStatus: string;
}

export interface WalletRecord {
    id: string;
    driverId: string;
    driverUserId?: string;
    driverName?: string;
    driverEmail?: string;
    driverPhone?: string;
    vehicleModel?: string;
    licensePlate?: string;
    balance: number;
    pendingBalance: number;
    currency: string;
    status: "ACTIVE" | "SUSPENDED" | "FROZEN";
    totalDeposited: number;
    totalDeducted: number;
    createdAt: string;
    updatedAt: string;
    transactions?: TransactionRecord[];
}

export interface TransactionRecord {
    id: string;
    walletId: string;
    rideId?: string | null;
    type: "CREDIT" | "DEBIT" | "REFUND" | "ADJUSTMENT";
    category: "FUNDING" | "RIDE_DEPOSIT" | "RIDE_REFUND" | "ADMIN_ADJUSTMENT";
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    currency: string;
    provider?: string | null;
    externalRef?: string | null;
    idempotencyKey?: string | null;
    status: "SUCCESS" | "FAILED" | "PENDING";
    note?: string | null;
    createdAt: string;
}

interface StoredData {
    config: {
        minBalanceLRD: number;
        rideDepositLRD: number;
        depositMode: "FIXED" | "PERCENT";
        rideDepositPercent: number;
        lastUpdated?: string;
    };
    wallets: WalletRecord[];
    transactions: TransactionRecord[];
}

// ─── Local File Helpers ──────────────────────────────────────────────────────

function readStoredData(): StoredData {
    try {
        if (fs.existsSync(WALLETS_FILE_PATH)) {
            const raw = fs.readFileSync(WALLETS_FILE_PATH, "utf-8");
            return JSON.parse(raw);
        }
    } catch (e) {
        console.error("Failed to read driver-wallets.json:", e);
    }

    return {
        config: {
            minBalanceLRD: DEFAULT_MIN_BALANCE,
            rideDepositLRD: DEFAULT_DEPOSIT_AMOUNT,
            depositMode: "FIXED",
            rideDepositPercent: DEFAULT_DEPOSIT_PERCENT,
            lastUpdated: new Date().toISOString(),
        },
        wallets: [],
        transactions: [],
    };
}

function writeStoredData(data: StoredData) {
    try {
        const dir = path.dirname(WALLETS_FILE_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(WALLETS_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {
        console.error("Failed to write driver-wallets.json:", e);
    }
}

// ─── Database DDL Schema Ensure ──────────────────────────────────────────────

let schemaChecked = false;

export async function ensureDriverWalletSchema() {
    if (schemaChecked || !isDbOnline()) return;
    try {
        await prisma.$executeRawUnsafe(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'DriverWallet') THEN
                    CREATE TABLE "DriverWallet" (
                        "id" VARCHAR(100) PRIMARY KEY,
                        "driverId" VARCHAR(100) UNIQUE NOT NULL,
                        "balance" DOUBLE PRECISION DEFAULT 0.0,
                        "pendingBalance" DOUBLE PRECISION DEFAULT 0.0,
                        "currency" VARCHAR(10) DEFAULT 'LRD',
                        "status" VARCHAR(50) DEFAULT 'ACTIVE',
                        "totalDeposited" DOUBLE PRECISION DEFAULT 0.0,
                        "totalDeducted" DOUBLE PRECISION DEFAULT 0.0,
                        "createdAt" TIMESTAMP DEFAULT NOW(),
                        "updatedAt" TIMESTAMP DEFAULT NOW()
                    );
                    CREATE UNIQUE INDEX IF NOT EXISTS "idx_driver_wallet_driver" ON "DriverWallet"("driverId");
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'WalletTransaction') THEN
                    CREATE TABLE "WalletTransaction" (
                        "id" VARCHAR(100) PRIMARY KEY,
                        "walletId" VARCHAR(100) NOT NULL,
                        "rideId" VARCHAR(100),
                        "type" VARCHAR(50) NOT NULL,
                        "category" VARCHAR(50) NOT NULL,
                        "amount" DOUBLE PRECISION NOT NULL,
                        "balanceBefore" DOUBLE PRECISION NOT NULL,
                        "balanceAfter" DOUBLE PRECISION NOT NULL,
                        "currency" VARCHAR(10) DEFAULT 'LRD',
                        "provider" VARCHAR(50),
                        "externalRef" VARCHAR(150),
                        "idempotencyKey" VARCHAR(150) UNIQUE,
                        "status" VARCHAR(50) DEFAULT 'SUCCESS',
                        "note" TEXT,
                        "createdAt" TIMESTAMP DEFAULT NOW(),
                        "updatedAt" TIMESTAMP DEFAULT NOW()
                    );
                    CREATE INDEX IF NOT EXISTS "idx_wallet_tx_wallet" ON "WalletTransaction"("walletId", "createdAt");
                    CREATE INDEX IF NOT EXISTS "idx_wallet_tx_ride" ON "WalletTransaction"("rideId");
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Ride' AND column_name = 'depositDeducted') THEN
                    ALTER TABLE "Ride" ADD COLUMN "depositDeducted" BOOLEAN DEFAULT FALSE;
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Ride' AND column_name = 'depositAmount') THEN
                    ALTER TABLE "Ride" ADD COLUMN "depositAmount" DOUBLE PRECISION;
                END IF;
            END $$;
        `);
        schemaChecked = true;
        markDbSuccess();
    } catch {
        markDbFailed();
    }
}

// ─── Configuration Management ────────────────────────────────────────────────

const CONFIG_KEY_MIN_BALANCE = "wallet.minBalanceLRD";
const CONFIG_KEY_DEPOSIT_AMOUNT = "wallet.rideDepositLRD";
const CONFIG_KEY_DEPOSIT_PERCENT = "wallet.rideDepositPercent";
const CONFIG_KEY_DEPOSIT_MODE = "wallet.depositMode";

export async function getWalletConfig(): Promise<WalletConfig> {
    if (isDbOnline()) {
        try {
            const keys = [CONFIG_KEY_MIN_BALANCE, CONFIG_KEY_DEPOSIT_AMOUNT, CONFIG_KEY_DEPOSIT_PERCENT, CONFIG_KEY_DEPOSIT_MODE];
            const configs = await prisma.systemConfig.findMany({ where: { key: { in: keys } } });
            if (configs && configs.length > 0) {
                const map: Record<string, string> = {};
                for (const c of configs) map[c.key] = c.value;
                markDbSuccess();
                return {
                    minBalance: parseFloat(map[CONFIG_KEY_MIN_BALANCE] ?? String(DEFAULT_MIN_BALANCE)),
                    depositAmount: parseFloat(map[CONFIG_KEY_DEPOSIT_AMOUNT] ?? String(DEFAULT_DEPOSIT_AMOUNT)),
                    depositPercent: parseFloat(map[CONFIG_KEY_DEPOSIT_PERCENT] ?? String(DEFAULT_DEPOSIT_PERCENT)),
                    depositMode: (map[CONFIG_KEY_DEPOSIT_MODE] as "FIXED" | "PERCENT") ?? "FIXED",
                };
            }
        } catch {
            markDbFailed();
        }
    }

    const data = readStoredData();
    return {
        minBalance: Number(data.config.minBalanceLRD || DEFAULT_MIN_BALANCE),
        depositAmount: Number(data.config.rideDepositLRD || DEFAULT_DEPOSIT_AMOUNT),
        depositPercent: Number(data.config.rideDepositPercent || DEFAULT_DEPOSIT_PERCENT),
        depositMode: data.config.depositMode || "FIXED",
    };
}

export async function updateWalletConfig(updates: Partial<WalletConfig>): Promise<WalletConfig> {
    const current = await getWalletConfig();
    const updated: WalletConfig = {
        minBalance: updates.minBalance !== undefined ? updates.minBalance : current.minBalance,
        depositAmount: updates.depositAmount !== undefined ? updates.depositAmount : current.depositAmount,
        depositPercent: updates.depositPercent !== undefined ? updates.depositPercent : current.depositPercent,
        depositMode: updates.depositMode || current.depositMode,
    };

    // Save to local file
    const data = readStoredData();
    data.config = {
        minBalanceLRD: updated.minBalance,
        rideDepositLRD: updated.depositAmount,
        depositMode: updated.depositMode,
        rideDepositPercent: updated.depositPercent,
        lastUpdated: new Date().toISOString(),
    };
    writeStoredData(data);

    // Save to DB if online
    if (isDbOnline()) {
        try {
            const dbUpdates = [
                { key: CONFIG_KEY_MIN_BALANCE, value: String(updated.minBalance) },
                { key: CONFIG_KEY_DEPOSIT_AMOUNT, value: String(updated.depositAmount) },
                { key: CONFIG_KEY_DEPOSIT_MODE, value: updated.depositMode },
                { key: CONFIG_KEY_DEPOSIT_PERCENT, value: String(updated.depositPercent) },
            ];
            for (const u of dbUpdates) {
                await prisma.systemConfig.upsert({
                    where: { key: u.key },
                    create: u,
                    update: { value: u.value },
                }).catch(() => {});
            }
            markDbSuccess();
        } catch {
            markDbFailed();
        }
    }

    return updated;
}

// ─── Wallet Lifecycle ────────────────────────────────────────────────────────

/**
 * Creates or retrieves a DriverWallet for a driver profile.
 * Automatically provisions initial wallet record if absent.
 */
export async function ensureDriverWallet(driverProfileId: string, driverInfo?: {
    userId?: string;
    name?: string;
    email?: string;
    phone?: string;
    vehicleModel?: string;
    licensePlate?: string;
}): Promise<WalletRecord> {
    await ensureDriverWalletSchema();

    // 1. Try DB first if online
    if (isDbOnline()) {
        try {
            const existing = await prisma.driverWallet.findUnique({
                where: { driverId: driverProfileId },
            });
            if (existing) {
                markDbSuccess();
                return {
                    ...existing,
                    status: existing.status as any,
                    createdAt: existing.createdAt.toISOString(),
                    updatedAt: existing.updatedAt.toISOString(),
                };
            }

            const created = await prisma.driverWallet.create({
                data: {
                    id: `wallet_${driverProfileId}`,
                    driverId: driverProfileId,
                    balance: 0,
                    pendingBalance: 0,
                    currency: "LRD",
                    status: "ACTIVE",
                },
            });
            markDbSuccess();
            return {
                ...created,
                status: created.status as any,
                createdAt: created.createdAt.toISOString(),
                updatedAt: created.updatedAt.toISOString(),
            };
        } catch {
            markDbFailed();
        }
    }

    const data = readStoredData();
    let wallet = data.wallets.find(w => w.driverId === driverProfileId || w.id === driverProfileId || w.driverUserId === driverProfileId);

    if (!wallet) {
        wallet = {
            id: `wallet_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            driverId: driverProfileId,
            driverUserId: driverInfo?.userId,
            driverName: driverInfo?.name || "Driver",
            driverEmail: driverInfo?.email || "",
            driverPhone: driverInfo?.phone || "",
            vehicleModel: driverInfo?.vehicleModel,
            licensePlate: driverInfo?.licensePlate,
            balance: 0,
            pendingBalance: 0,
            currency: "LRD",
            status: "ACTIVE",
            totalDeposited: 0,
            totalDeducted: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        data.wallets.push(wallet);
        writeStoredData(data);
    }

    return wallet;
}

/**
 * Fetches a driver's wallet along with their transaction history.
 */
export async function getDriverWallet(driverProfileId: string): Promise<{
    wallet: WalletRecord | null;
    transactions: TransactionRecord[];
}> {
    await ensureDriverWalletSchema();

    // Try DB if online
    if (isDbOnline()) {
        try {
            const wallet = await prisma.driverWallet.findUnique({
                where: { driverId: driverProfileId },
                include: {
                    transactions: {
                        orderBy: { createdAt: "desc" },
                        take: 50,
                    },
                },
            });
            if (wallet) {
                markDbSuccess();
                const { transactions: rawTxs, ...walletFields } = wallet;
                return {
                    wallet: {
                        ...walletFields,
                        status: walletFields.status as any,
                        createdAt: walletFields.createdAt.toISOString(),
                        updatedAt: walletFields.updatedAt.toISOString(),
                    },
                    transactions: rawTxs.map(t => ({
                        ...t,
                        type: t.type as any,
                        category: t.category as any,
                        status: t.status as any,
                        createdAt: t.createdAt.toISOString(),
                    })),
                };
            }
        } catch {
            markDbFailed();
        }
    }

    // Fallback to local file store
    const data = readStoredData();
    const wallet = data.wallets.find(w => w.driverId === driverProfileId || w.id === driverProfileId || w.driverUserId === driverProfileId) || null;
    const transactions = wallet
        ? data.transactions.filter(t => t.walletId === wallet.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        : [];

    return { wallet, transactions };
}

// ─── Eligibility Validation ──────────────────────────────────────────────────

/**
 * Validates whether a driver has sufficient balance to be online and receive/accept rides.
 */
export async function checkDriverEligibility(driverProfileId: string): Promise<WalletEligibility> {
    const config = await getWalletConfig();
    const { wallet } = await getDriverWallet(driverProfileId);

    const balance = wallet ? Number(wallet.balance) : 0;
    const minBalance = config.minBalance;
    const status = wallet?.status || "NO_WALLET";
    const eligible = status === "ACTIVE" && balance >= minBalance;

    return {
        eligible,
        balance,
        minBalance,
        shortfall: Math.max(0, minBalance - balance),
        walletStatus: status,
    };
}

// ─── Wallet Credit (Fund / Refund / Adjustment) ──────────────────────────────

export interface WalletCreditOptions {
    driverProfileId: string;
    amount: number;
    category: "FUNDING" | "ADMIN_ADJUSTMENT" | "RIDE_REFUND";
    provider?: string;
    externalRef?: string;
    idempotencyKey?: string;
    note?: string;
}

export async function creditWallet(opts: WalletCreditOptions): Promise<TransactionRecord> {
    const { driverProfileId, amount, category, provider, externalRef, idempotencyKey, note } = opts;

    if (amount <= 0) throw new Error("Credit amount must be positive");

    const data = readStoredData();

    // Idempotency check in local data
    if (idempotencyKey) {
        const existingTx = data.transactions.find(t => t.idempotencyKey === idempotencyKey);
        if (existingTx) return existingTx;
    }

    // Try DB transaction if online
    if (isDbOnline()) {
        try {
            await ensureDriverWalletSchema();
            const wallet = await ensureDriverWallet(driverProfileId);

            const tx = await prisma.$transaction(async (prismaTx) => {
                const fresh = await prismaTx.driverWallet.findUnique({ where: { id: wallet.id } });
                if (!fresh) throw new Error("Wallet not found in DB");

                const newBalance = fresh.balance + amount;
                const newTotalDeposited = fresh.totalDeposited + (category === "FUNDING" ? amount : 0);

                await prismaTx.driverWallet.update({
                    where: { id: wallet.id },
                    data: {
                        balance: newBalance,
                        totalDeposited: newTotalDeposited,
                        updatedAt: new Date(),
                    },
                });

                return prismaTx.walletTransaction.create({
                    data: {
                        id: `TXN-WAL-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
                        walletId: wallet.id,
                        type: "CREDIT",
                        category,
                        amount,
                        balanceBefore: fresh.balance,
                        balanceAfter: newBalance,
                        currency: fresh.currency,
                        provider: provider || "SYSTEM",
                        externalRef,
                        idempotencyKey,
                        status: "SUCCESS",
                        note,
                    },
                });
            });

            markDbSuccess();
            return {
                ...tx,
                type: tx.type as any,
                category: tx.category as any,
                status: tx.status as any,
                createdAt: tx.createdAt.toISOString(),
            };
        } catch {
            markDbFailed();
        }
    }

    let targetWallet = data.wallets.find(w => w.driverId === driverProfileId || w.id === driverProfileId || w.driverUserId === driverProfileId);
    if (!targetWallet) {
        targetWallet = await ensureDriverWallet(driverProfileId);
        data.wallets.push(targetWallet);
    }

    const balanceBefore = Number(targetWallet.balance);
    const balanceAfter = balanceBefore + amount;

    targetWallet.balance = balanceAfter;
    if (category === "FUNDING") {
        targetWallet.totalDeposited = (targetWallet.totalDeposited || 0) + amount;
    }
    targetWallet.updatedAt = new Date().toISOString();

    const newTx: TransactionRecord = {
        id: `TXN-WAL-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        walletId: targetWallet.id,
        type: "CREDIT",
        category,
        amount,
        balanceBefore,
        balanceAfter,
        currency: targetWallet.currency,
        provider: provider || "SYSTEM",
        externalRef: externalRef || null,
        idempotencyKey: idempotencyKey || null,
        status: "SUCCESS",
        note: note || null,
        createdAt: new Date().toISOString(),
    };

    data.transactions.unshift(newTx);
    writeStoredData(data);

    return newTx;
}

// ─── Wallet Debit (Ride Deposit Deduction) ───────────────────────────────────

export interface WalletDebitOptions {
    driverProfileId: string;
    rideId: string;
    amount: number;
    idempotencyKey?: string;
    note?: string;
}

export interface WalletDebitResult {
    success: boolean;
    transaction?: TransactionRecord;
    error?: string;
    balance?: number;
}

export async function deductRideDeposit(opts: WalletDebitOptions): Promise<WalletDebitResult> {
    const { driverProfileId, rideId, amount, idempotencyKey, note } = opts;

    if (amount <= 0) return { success: false, error: "Deduction amount must be positive" };

    const iKey = idempotencyKey || `ride-deposit-${rideId}`;
    const data = readStoredData();

    // Idempotency check: prevent duplicate deductions for same ride
    const existingTx = data.transactions.find(t => t.idempotencyKey === iKey || (t.rideId === rideId && t.type === "DEBIT"));
    if (existingTx) {
        return { success: true, transaction: existingTx, balance: existingTx.balanceAfter };
    }

    // Check in database if online
    if (isDbOnline()) {
        try {
            await ensureDriverWalletSchema();
            const ride = await prisma.ride.findUnique({ where: { id: rideId }, select: { depositDeducted: true } });
            if (ride?.depositDeducted) {
                return { success: true, error: "Deposit already deducted for this ride" };
            }

            const wallet = await prisma.driverWallet.findUnique({ where: { driverId: driverProfileId } });
            if (wallet) {
                if (wallet.status !== "ACTIVE") return { success: false, error: "Wallet is suspended or inactive" };
                if (wallet.balance < amount) {
                    return { success: false, error: `Insufficient wallet balance. Required: ${amount} LRD, Available: ${wallet.balance} LRD` };
                }

                const txRecord = await prisma.$transaction(async (tx) => {
                    const fresh = await tx.driverWallet.findUnique({ where: { id: wallet.id } });
                    if (!fresh || fresh.balance < amount) throw new Error("Insufficient balance at moment of deduction");

                    const newBalance = fresh.balance - amount;

                    await tx.driverWallet.update({
                        where: { id: wallet.id },
                        data: {
                            balance: newBalance,
                            totalDeducted: fresh.totalDeducted + amount,
                            updatedAt: new Date(),
                        },
                    });

                    await tx.ride.update({
                        where: { id: rideId },
                        data: { depositDeducted: true, depositAmount: amount },
                    }).catch(() => {});

                    return tx.walletTransaction.create({
                        data: {
                            id: `TXN-WAL-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
                            walletId: wallet.id,
                            rideId,
                            type: "DEBIT",
                            category: "RIDE_DEPOSIT",
                            amount,
                            balanceBefore: fresh.balance,
                            balanceAfter: newBalance,
                            currency: fresh.currency,
                            provider: "SYSTEM",
                            idempotencyKey: iKey,
                            status: "SUCCESS",
                            note: note || `Ride deposit for ride ${rideId}`,
                        },
                    });
                });

                markDbSuccess();
                return {
                    success: true,
                    transaction: {
                        ...txRecord,
                        type: txRecord.type as any,
                        category: txRecord.category as any,
                        status: txRecord.status as any,
                        createdAt: txRecord.createdAt.toISOString(),
                    },
                    balance: txRecord.balanceAfter,
                };
            }
        } catch {
            markDbFailed();
        }
    }

    // Local file fallback
    let targetWallet = data.wallets.find(w => w.driverId === driverProfileId || w.id === driverProfileId || w.driverUserId === driverProfileId);
    if (!targetWallet) {
        return { success: false, error: "Driver wallet not found" };
    }
    if (targetWallet.status !== "ACTIVE") {
        return { success: false, error: "Wallet is suspended or inactive" };
    }
    if (targetWallet.balance < amount) {
        return { success: false, error: `Insufficient wallet balance. Required: ${amount} LRD, Available: ${targetWallet.balance} LRD` };
    }

    const balanceBefore = targetWallet.balance;
    const balanceAfter = balanceBefore - amount;

    targetWallet.balance = balanceAfter;
    targetWallet.totalDeducted = (targetWallet.totalDeducted || 0) + amount;
    targetWallet.updatedAt = new Date().toISOString();

    const newTx: TransactionRecord = {
        id: `TXN-WAL-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        walletId: targetWallet.id,
        rideId,
        type: "DEBIT",
        category: "RIDE_DEPOSIT",
        amount,
        balanceBefore,
        balanceAfter,
        currency: targetWallet.currency,
        provider: "SYSTEM",
        idempotencyKey: iKey,
        status: "SUCCESS",
        note: note || `Ride deposit for ride ${rideId}`,
        createdAt: new Date().toISOString(),
    };

    data.transactions.unshift(newTx);
    writeStoredData(data);

    return { success: true, transaction: newTx, balance: balanceAfter };
}

// ─── Refund Ride Deposit ─────────────────────────────────────────────────────

/**
 * Refunds a deducted ride deposit if the ride was cancelled or unstarted.
 */
export async function refundRideDeposit(rideId: string, reason?: string): Promise<{
    refunded: boolean;
    transaction?: TransactionRecord;
    message?: string;
}> {
    const data = readStoredData();

    // Check if deposit was deducted for this ride
    const debitTx = data.transactions.find(t => t.rideId === rideId && t.type === "DEBIT" && t.status === "SUCCESS");
    if (!debitTx) {
        return { refunded: false, message: "No deposit was deducted for this ride." };
    }

    // Check if already refunded
    const existingRefund = data.transactions.find(t => t.rideId === rideId && t.category === "RIDE_REFUND");
    if (existingRefund) {
        return { refunded: true, transaction: existingRefund, message: "Deposit has already been refunded." };
    }

    const wallet = data.wallets.find(w => w.id === debitTx.walletId);
    if (!wallet) return { refunded: false, message: "Target wallet not found" };

    const refundTx = await creditWallet({
        driverProfileId: wallet.driverId,
        amount: debitTx.amount,
        category: "RIDE_REFUND",
        provider: "SYSTEM",
        externalRef: `REFUND-${rideId}`,
        idempotencyKey: `refund-deposit-${rideId}`,
        note: reason || `Refund for cancelled ride ${rideId}`,
    });

    // Reset ride deposit flag in DB if reachable
    if (isDbOnline()) {
        try {
            await prisma.ride.update({
                where: { id: rideId },
                data: { depositDeducted: false },
            }).catch(() => {});
        } catch {}
    }

    return { refunded: true, transaction: refundTx, message: `Refunded ${debitTx.amount} LRD to driver's wallet.` };
}

// ─── Admin Adjustment ────────────────────────────────────────────────────────

export interface AdminAdjustmentOptions {
    driverProfileId: string;
    amount: number;         // Positive = credit, Negative = debit
    note: string;
    adminUserId: string;
}

export async function adminAdjustWallet(opts: AdminAdjustmentOptions): Promise<TransactionRecord> {
    const { driverProfileId, amount, note, adminUserId } = opts;
    if (amount === 0) throw new Error("Adjustment amount cannot be zero");

    const data = readStoredData();
    let wallet = data.wallets.find(w => w.driverId === driverProfileId || w.id === driverProfileId);
    if (!wallet) {
        wallet = await ensureDriverWallet(driverProfileId);
        data.wallets.push(wallet);
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = Math.max(0, balanceBefore + amount);

    wallet.balance = balanceAfter;
    if (amount > 0) wallet.totalDeposited = (wallet.totalDeposited || 0) + amount;
    else wallet.totalDeducted = (wallet.totalDeducted || 0) + Math.abs(amount);
    wallet.updatedAt = new Date().toISOString();

    const newTx: TransactionRecord = {
        id: `TXN-WAL-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        walletId: wallet.id,
        type: amount > 0 ? "CREDIT" : "DEBIT",
        category: "ADMIN_ADJUSTMENT",
        amount: Math.abs(amount),
        balanceBefore,
        balanceAfter,
        currency: wallet.currency,
        provider: "ADMIN",
        status: "SUCCESS",
        note: `[Admin: ${adminUserId}] ${note}`,
        createdAt: new Date().toISOString(),
    };

    data.transactions.unshift(newTx);
    writeStoredData(data);

    // Also update DB if online
    if (isDbOnline()) {
        try {
            await prisma.$executeRawUnsafe(`
                UPDATE "DriverWallet"
                SET "balance" = $1, "updatedAt" = NOW()
                WHERE "id" = $2 OR "driverId" = $3
            `, balanceAfter, wallet.id, driverProfileId);
        } catch {}
    }

    return newTx;
}

// ─── Wallet Status (Suspend / Activate) ──────────────────────────────────────

export async function setWalletStatus(driverProfileId: string, status: "ACTIVE" | "SUSPENDED" | "FROZEN"): Promise<boolean> {
    const data = readStoredData();
    const wallet = data.wallets.find(w => w.driverId === driverProfileId || w.id === driverProfileId);
    if (wallet) {
        wallet.status = status;
        wallet.updatedAt = new Date().toISOString();
        writeStoredData(data);
    }

    if (isDbOnline()) {
        try {
            await prisma.driverWallet.update({
                where: { driverId: driverProfileId },
                data: { status },
            }).catch(() => {});
        } catch {}
    }

    return true;
}

// ─── Calculate Ride Deposit Amount ───────────────────────────────────────────

export async function calculateRideDeposit(fare?: number | null): Promise<number> {
    const config = await getWalletConfig();
    if (config.depositMode === "PERCENT" && fare && fare > 0) {
        return Math.round((fare * config.depositPercent) / 100);
    }
    return config.depositAmount;
}

// ─── Admin Listing & Reporting ───────────────────────────────────────────────

export async function listAllWallets(filter: string = "ALL", search: string = "") {
    const config = await getWalletConfig();
    const data = readStoredData();

    let wallets = data.wallets.map(w => {
        const txs = data.transactions.filter(t => t.walletId === w.id);
        const isEligible = w.status === "ACTIVE" && w.balance >= config.minBalance;
        return {
            id: w.id,
            balance: w.balance,
            pendingBalance: w.pendingBalance,
            currency: w.currency,
            status: w.status,
            totalDeposited: w.totalDeposited,
            totalDeducted: w.totalDeducted,
            createdAt: w.createdAt,
            updatedAt: w.updatedAt,
            eligible: isEligible,
            shortfall: Math.max(0, config.minBalance - w.balance),
            driver: {
                id: w.driverId,
                user: {
                    id: w.driverUserId || w.driverId,
                    name: w.driverName || "Driver",
                    email: w.driverEmail || "",
                    phone: w.driverPhone || "",
                },
            },
            transactions: txs.slice(0, 10),
        };
    });

    if (filter === "ELIGIBLE") wallets = wallets.filter(w => w.eligible);
    if (filter === "INELIGIBLE") wallets = wallets.filter(w => !w.eligible);
    if (filter === "SUSPENDED") wallets = wallets.filter(w => w.status !== "ACTIVE");

    if (search) {
        const s = search.toLowerCase();
        wallets = wallets.filter(w =>
            w.driver.user.name.toLowerCase().includes(s) ||
            w.driver.user.email.toLowerCase().includes(s) ||
            w.driver.user.phone.includes(s)
        );
    }

    const allWallets = data.wallets;
    const stats = {
        totalWallets: allWallets.length,
        totalBalance: allWallets.reduce((s, w) => s + w.balance, 0),
        eligibleDrivers: allWallets.filter(w => w.status === "ACTIVE" && w.balance >= config.minBalance).length,
        ineligibleDrivers: allWallets.filter(w => w.status !== "ACTIVE" || w.balance < config.minBalance).length,
        suspendedWallets: allWallets.filter(w => w.status !== "ACTIVE").length,
        driversWithoutWallets: 0,
    };

    return {
        wallets,
        stats,
        config,
    };
}
