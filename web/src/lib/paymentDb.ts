import { prisma } from "@/lib/db";
import fs from "fs";
import path from "path";

export interface MtnMomoConfig {
    enabled: boolean;
    providerName: string;
    merchantNumber: string;
    businessName: string;
    apiUser: string;
    apiKey: string;
    subscriptionKey: string;
    targetEnvironment: "SANDBOX" | "PRODUCTION";
    webhookSecret: string;
    currency: "LRD" | "USD";
    ussdPromptEnabled: boolean;
}

export interface OrangeMoneyConfig {
    enabled: boolean;
    providerName: string;
    merchantNumber: string;
    businessName: string;
    clientId: string;
    clientSecret: string;
    merchantKey: string;
    targetEnvironment: "SANDBOX" | "PRODUCTION";
    webhookSecret: string;
    currency: "LRD" | "USD";
    ussdPromptEnabled: boolean;
}

export interface DepositRulesConfig {
    depositMode: "PERCENTAGE" | "FIXED_AMOUNT" | "FULL_FARE";
    depositPercentage: number;
    depositFixedAmount: number;
    currency: "USD" | "LRD";
    minDeposit: number;
    maxDeposit: number;
    autoInitiateOnStart: boolean;
    requireCustomerAuth: boolean;
    autoRefundOnCancel: boolean;
}

export interface PaymentSystemConfig {
    mtn: MtnMomoConfig;
    orange: OrangeMoneyConfig;
    depositRules: DepositRulesConfig;
    lastUpdated: string;
}

export interface DepositTransaction {
    id: string;
    rideId: string;
    idempotencyKey: string;
    provider: "MTN_MOMO" | "ORANGE_MONEY";
    amount: number;
    currency: "USD" | "LRD";
    fare: number;
    depositRate: string;
    customerPhone: string;
    customerName: string;
    driverName?: string;
    status: "PENDING" | "SUCCESSFUL" | "FAILED" | "CANCELLED";
    externalId?: string;
    failureReason?: string;
    customerPromptStatus: "PROMPTED" | "PIN_ENTERED" | "EXPIRED" | "REJECTED";
    createdAt: string;
    authorizedAt?: string;
    confirmedAt?: string;
}

export interface CompanyWalletState {
    availableBalanceUSD: number;
    availableBalanceLRD: number;
    pendingBalanceUSD: number;
    pendingBalanceLRD: number;
    totalCollectedUSD: number;
    totalCollectedLRD: number;
    totalTransactionsCount: number;
    successfulCount: number;
    pendingCount: number;
    failedCount: number;
    lastReconciliation: string;
}

// Memory and file-based fallback store
const CONFIG_FILE_PATH = path.join(process.cwd(), "src", "data", "payment-config.json");

// In-memory fallback ledger (persisted across warm serverless requests and local dev)
let inMemoryWallet: CompanyWalletState = {
    availableBalanceUSD: 142.50,
    availableBalanceLRD: 26500.00,
    pendingBalanceUSD: 0.00,
    pendingBalanceLRD: 0.00,
    totalCollectedUSD: 142.50,
    totalCollectedLRD: 26500.00,
    totalTransactionsCount: 14,
    successfulCount: 14,
    pendingCount: 0,
    failedCount: 0,
    lastReconciliation: new Date().toISOString(),
};

let inMemoryTransactions: DepositTransaction[] = [
    {
        id: "TXN-DEP-101",
        rideId: "RIDE-INIT-01",
        idempotencyKey: "DEP-RIDE-INIT-01",
        provider: "MTN_MOMO",
        amount: 2.00,
        currency: "USD",
        fare: 10.00,
        depositRate: "20% Deposit",
        customerPhone: "+231 88 012 3456",
        customerName: "Comfort Tweh",
        driverName: "Emmanuel J. Kollie",
        status: "SUCCESSFUL",
        externalId: "MTN-REF-8492019",
        customerPromptStatus: "PIN_ENTERED",
        createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        authorizedAt: new Date(Date.now() - 3600000 * 4 + 15000).toISOString(),
        confirmedAt: new Date(Date.now() - 3600000 * 4 + 18000).toISOString()
    },
    {
        id: "TXN-DEP-102",
        rideId: "RIDE-INIT-02",
        idempotencyKey: "DEP-RIDE-INIT-02",
        provider: "ORANGE_MONEY",
        amount: 3.50,
        currency: "USD",
        fare: 17.50,
        depositRate: "20% Deposit",
        customerPhone: "+231 77 987 6543",
        customerName: "David Cooper",
        driverName: "Sarah Doe Kamara",
        status: "SUCCESSFUL",
        externalId: "OM-TXN-9912048",
        customerPromptStatus: "PIN_ENTERED",
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        authorizedAt: new Date(Date.now() - 3600000 * 2 + 12000).toISOString(),
        confirmedAt: new Date(Date.now() - 3600000 * 2 + 16000).toISOString()
    }
];

let schemaChecked = false;

/**
 * Ensures database tables and columns exist in PostgreSQL.
 * Completely idempotent and fault-tolerant.
 */
export async function ensurePaymentSchema() {
    if (schemaChecked) return;
    try {
        await prisma.$executeRawUnsafe(`
            DO $$
            BEGIN
                -- 1. Ensure CompanyWallet table exists
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.tables WHERE table_name = 'CompanyWallet'
                ) THEN
                    CREATE TABLE "CompanyWallet" (
                        "id" VARCHAR(100) PRIMARY KEY DEFAULT 'primary_company_wallet',
                        "availableBalanceUSD" DOUBLE PRECISION DEFAULT 0.0,
                        "availableBalanceLRD" DOUBLE PRECISION DEFAULT 0.0,
                        "pendingBalanceUSD" DOUBLE PRECISION DEFAULT 0.0,
                        "pendingBalanceLRD" DOUBLE PRECISION DEFAULT 0.0,
                        "totalCollectedUSD" DOUBLE PRECISION DEFAULT 0.0,
                        "totalCollectedLRD" DOUBLE PRECISION DEFAULT 0.0,
                        "lastReconciliation" TIMESTAMP DEFAULT NOW(),
                        "updatedAt" TIMESTAMP DEFAULT NOW()
                    );
                    INSERT INTO "CompanyWallet" ("id", "availableBalanceUSD", "availableBalanceLRD") 
                    VALUES ('primary_company_wallet', 142.50, 26500.0) 
                    ON CONFLICT ("id") DO NOTHING;
                END IF;

                -- 2. Ensure DepositTransaction table exists
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.tables WHERE table_name = 'DepositTransaction'
                ) THEN
                    CREATE TABLE "DepositTransaction" (
                        "id" VARCHAR(100) PRIMARY KEY,
                        "rideId" VARCHAR(100) NOT NULL,
                        "idempotencyKey" VARCHAR(150) UNIQUE NOT NULL,
                        "provider" VARCHAR(50) NOT NULL,
                        "amount" DOUBLE PRECISION NOT NULL,
                        "currency" VARCHAR(10) DEFAULT 'USD',
                        "fare" DOUBLE PRECISION NOT NULL,
                        "depositRate" VARCHAR(50),
                        "customerPhone" VARCHAR(50),
                        "customerName" VARCHAR(150),
                        "driverName" VARCHAR(150),
                        "status" VARCHAR(50) DEFAULT 'PENDING',
                        "externalId" VARCHAR(150),
                        "failureReason" TEXT,
                        "customerPromptStatus" VARCHAR(50) DEFAULT 'PROMPTED',
                        "createdAt" TIMESTAMP DEFAULT NOW(),
                        "authorizedAt" TIMESTAMP,
                        "confirmedAt" TIMESTAMP
                    );
                    CREATE INDEX IF NOT EXISTS "idx_dep_tx_ride" ON "DepositTransaction"("rideId");
                    CREATE INDEX IF NOT EXISTS "idx_dep_tx_status" ON "DepositTransaction"("status");
                END IF;

                -- 3. Add deposit columns to Ride table if not present
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'Ride' AND column_name = 'depositStatus'
                ) THEN
                    ALTER TABLE "Ride" ADD COLUMN "depositStatus" VARCHAR(50) DEFAULT 'NOT_REQUIRED';
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'Ride' AND column_name = 'depositAmount'
                ) THEN
                    ALTER TABLE "Ride" ADD COLUMN "depositAmount" DOUBLE PRECISION;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'Ride' AND column_name = 'depositTxRef'
                ) THEN
                    ALTER TABLE "Ride" ADD COLUMN "depositTxRef" VARCHAR(100);
                END IF;
            END $$;
        `);
        schemaChecked = true;
    } catch (err) {
        console.warn("Notice: ensurePaymentSchema DDL skipped or DB offline. Using resilient fallback.", err);
    }
}

/**
 * Retrieves the current payment settings (MTN, Orange, and Deposit Rules).
 */
export async function getPaymentConfig(): Promise<PaymentSystemConfig> {
    try {
        if (fs.existsSync(CONFIG_FILE_PATH)) {
            const raw = fs.readFileSync(CONFIG_FILE_PATH, "utf-8");
            return JSON.parse(raw);
        }
    } catch (e) {
        console.error("Failed to read payment-config.json, returning defaults", e);
    }

    return {
        mtn: {
            enabled: true,
            providerName: "MTN Mobile Money",
            merchantNumber: "0886000100",
            businessName: "AfriCab Transport Services Inc.",
            apiUser: "mtn-momo-user-placeholder-uuid",
            apiKey: "••••••••••••••••••••••••",
            subscriptionKey: "••••••••••••••••••••••••",
            targetEnvironment: "SANDBOX",
            webhookSecret: "whsec_momo_placeholder_key",
            currency: "LRD",
            ussdPromptEnabled: true,
        },
        orange: {
            enabled: true,
            providerName: "Orange Money",
            merchantNumber: "0777000200",
            businessName: "AfriCab Transport Services Inc.",
            clientId: "om_client_placeholder_id",
            clientSecret: "••••••••••••••••••••••••",
            merchantKey: "••••••••••••••••••••••••",
            targetEnvironment: "SANDBOX",
            webhookSecret: "whsec_orange_placeholder_key",
            currency: "LRD",
            ussdPromptEnabled: true,
        },
        depositRules: {
            depositMode: "PERCENTAGE",
            depositPercentage: 20,
            depositFixedAmount: 2.50,
            currency: "USD",
            minDeposit: 1.00,
            maxDeposit: 25.00,
            autoInitiateOnStart: true,
            requireCustomerAuth: true,
            autoRefundOnCancel: true,
        },
        lastUpdated: new Date().toISOString(),
    };
}

/**
 * Saves payment configuration updates.
 */
export async function savePaymentConfig(updates: Partial<PaymentSystemConfig>): Promise<PaymentSystemConfig> {
    const current = await getPaymentConfig();
    const updated: PaymentSystemConfig = {
        mtn: updates.mtn ? { ...current.mtn, ...updates.mtn } : current.mtn,
        orange: updates.orange ? { ...current.orange, ...updates.orange } : current.orange,
        depositRules: updates.depositRules ? { ...current.depositRules, ...updates.depositRules } : current.depositRules,
        lastUpdated: new Date().toISOString(),
    };

    try {
        const dir = path.dirname(CONFIG_FILE_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(updated, null, 2), "utf-8");
    } catch (e) {
        console.error("Failed to write payment-config.json", e);
    }

    return updated;
}

/**
 * Retrieves the current company wallet summary balance.
 */
export async function getCompanyWallet(): Promise<CompanyWalletState> {
    await ensurePaymentSchema();
    try {
        const rows: any = await prisma.$queryRawUnsafe(`
            SELECT * FROM "CompanyWallet" WHERE "id" = 'primary_company_wallet' LIMIT 1
        `);
        if (rows && rows.length > 0) {
            const r = rows[0];
            return {
                availableBalanceUSD: Number(r.availableBalanceUSD || 0),
                availableBalanceLRD: Number(r.availableBalanceLRD || 0),
                pendingBalanceUSD: Number(r.pendingBalanceUSD || 0),
                pendingBalanceLRD: Number(r.pendingBalanceLRD || 0),
                totalCollectedUSD: Number(r.totalCollectedUSD || 0),
                totalCollectedLRD: Number(r.totalCollectedLRD || 0),
                totalTransactionsCount: inMemoryTransactions.length,
                successfulCount: inMemoryTransactions.filter(t => t.status === "SUCCESSFUL").length,
                pendingCount: inMemoryTransactions.filter(t => t.status === "PENDING").length,
                failedCount: inMemoryTransactions.filter(t => t.status === "FAILED" || t.status === "CANCELLED").length,
                lastReconciliation: r.lastReconciliation ? new Date(r.lastReconciliation).toISOString() : new Date().toISOString(),
            };
        }
    } catch {}

    // Resilient fallback
    return inMemoryWallet;
}

/**
 * Lists deposit transactions with search and filters.
 */
export async function getDepositTransactions(params: {
    status?: string;
    provider?: string;
    search?: string;
    limit?: number;
}): Promise<DepositTransaction[]> {
    await ensurePaymentSchema();
    let txs = [...inMemoryTransactions];

    try {
        const rows: any = await prisma.$queryRawUnsafe(`
            SELECT * FROM "DepositTransaction" ORDER BY "createdAt" DESC LIMIT 100
        `);
        if (rows && rows.length > 0) {
            txs = rows.map((r: any) => ({
                id: r.id,
                rideId: r.rideId,
                idempotencyKey: r.idempotencyKey,
                provider: r.provider,
                amount: Number(r.amount),
                currency: r.currency,
                fare: Number(r.fare),
                depositRate: r.depositRate,
                customerPhone: r.customerPhone,
                customerName: r.customerName,
                driverName: r.driverName,
                status: r.status,
                externalId: r.externalId,
                failureReason: r.failureReason,
                customerPromptStatus: r.customerPromptStatus,
                createdAt: new Date(r.createdAt).toISOString(),
                authorizedAt: r.authorizedAt ? new Date(r.authorizedAt).toISOString() : undefined,
                confirmedAt: r.confirmedAt ? new Date(r.confirmedAt).toISOString() : undefined,
            }));
        }
    } catch {}

    if (params.status && params.status !== "ALL") {
        txs = txs.filter(t => t.status === params.status);
    }

    if (params.provider && params.provider !== "ALL") {
        txs = txs.filter(t => t.provider === params.provider);
    }

    if (params.search) {
        const s = params.search.toLowerCase();
        txs = txs.filter(t =>
            t.id.toLowerCase().includes(s) ||
            t.rideId.toLowerCase().includes(s) ||
            (t.customerPhone && t.customerPhone.toLowerCase().includes(s)) ||
            (t.customerName && t.customerName.toLowerCase().includes(s)) ||
            (t.externalId && t.externalId.toLowerCase().includes(s))
        );
    }

    const limit = params.limit || 50;
    return txs.slice(0, limit);
}

/**
 * Finds a deposit transaction by ride ID.
 */
export async function getDepositByRideId(rideId: string): Promise<DepositTransaction | null> {
    const all = inMemoryTransactions.filter(t => t.rideId === rideId);
    if (all.length > 0) return all[all.length - 1];

    try {
        const rows: any = await prisma.$queryRawUnsafe(`
            SELECT * FROM "DepositTransaction" WHERE "rideId" = $1 ORDER BY "createdAt" DESC LIMIT 1
        `, rideId);
        if (rows && rows.length > 0) {
            const r = rows[0];
            return {
                id: r.id,
                rideId: r.rideId,
                idempotencyKey: r.idempotencyKey,
                provider: r.provider,
                amount: Number(r.amount),
                currency: r.currency,
                fare: Number(r.fare),
                depositRate: r.depositRate,
                customerPhone: r.customerPhone,
                customerName: r.customerName,
                driverName: r.driverName,
                status: r.status,
                externalId: r.externalId,
                failureReason: r.failureReason,
                customerPromptStatus: r.customerPromptStatus,
                createdAt: new Date(r.createdAt).toISOString(),
                authorizedAt: r.authorizedAt ? new Date(r.authorizedAt).toISOString() : undefined,
                confirmedAt: r.confirmedAt ? new Date(r.confirmedAt).toISOString() : undefined,
            };
        }
    } catch {}

    return null;
}

/**
 * Idempotently initiates a deposit transaction when the driver starts a ride.
 * Crucial rule: The company wallet available balance is NOT credited here.
 * Only pending balance is tracked until provider confirmation!
 */
export async function createDepositTransaction(data: {
    rideId: string;
    provider: "MTN_MOMO" | "ORANGE_MONEY";
    amount: number;
    currency: "USD" | "LRD";
    fare: number;
    depositRate: string;
    customerPhone: string;
    customerName: string;
    driverName?: string;
}): Promise<DepositTransaction> {
    await ensurePaymentSchema();

    // Idempotency: check if an active pending or successful deposit already exists for this ride
    const existing = inMemoryTransactions.find(t => t.rideId === data.rideId && (t.status === "PENDING" || t.status === "SUCCESSFUL"));
    if (existing) {
        return existing;
    }

    const id = `TXN-DEP-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const idempotencyKey = `DEP-${data.provider}-${data.rideId}`;
    const now = new Date().toISOString();

    const newTx: DepositTransaction = {
        id,
        rideId: data.rideId,
        idempotencyKey,
        provider: data.provider,
        amount: data.amount,
        currency: data.currency,
        fare: data.fare,
        depositRate: data.depositRate,
        customerPhone: data.customerPhone,
        customerName: data.customerName,
        driverName: data.driverName,
        status: "PENDING",
        customerPromptStatus: "PROMPTED",
        createdAt: now,
    };

    inMemoryTransactions.unshift(newTx);

    // Update pending balance (available balance is NOT increased yet!)
    if (data.currency === "USD") {
        inMemoryWallet.pendingBalanceUSD += data.amount;
    } else {
        inMemoryWallet.pendingBalanceLRD += data.amount;
    }
    inMemoryWallet.totalTransactionsCount += 1;
    inMemoryWallet.pendingCount += 1;

    try {
        await prisma.$executeRawUnsafe(`
            INSERT INTO "DepositTransaction" (
                "id", "rideId", "idempotencyKey", "provider", "amount", "currency", 
                "fare", "depositRate", "customerPhone", "customerName", "driverName", 
                "status", "customerPromptStatus", "createdAt"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PENDING', 'PROMPTED', NOW())
            ON CONFLICT ("idempotencyKey") DO NOTHING
        `, id, data.rideId, idempotencyKey, data.provider, data.amount, data.currency, 
           data.fare, data.depositRate, data.customerPhone, data.customerName, data.driverName || 'Driver');

        await prisma.$executeRawUnsafe(`
            UPDATE "Ride" 
            SET "depositStatus" = 'PENDING', "depositAmount" = $1, "depositTxRef" = $2
            WHERE "id" = $3
        `, data.amount, id, data.rideId);
    } catch (e) {
        console.warn("Notice: DB insert for DepositTransaction failed, cached in memory.", e);
    }

    return newTx;
}

/**
 * Confirms a successful deposit from the payment provider (webhook or verified callback).
 * ONLY HERE is the company wallet credited with the available balance!
 */
export async function confirmDepositTransaction(txId: string, externalId?: string): Promise<DepositTransaction | null> {
    await ensurePaymentSchema();
    const tx = inMemoryTransactions.find(t => t.id === txId || t.externalId === txId || t.idempotencyKey === txId);
    if (!tx) return null;

    if (tx.status === "SUCCESSFUL") {
        // Idempotent: already confirmed
        return tx;
    }

    const now = new Date().toISOString();
    tx.status = "SUCCESSFUL";
    tx.customerPromptStatus = "PIN_ENTERED";
    tx.confirmedAt = now;
    if (externalId) tx.externalId = externalId;

    // Credit Company Wallet available balance & clear pending balance
    if (tx.currency === "USD") {
        inMemoryWallet.availableBalanceUSD += tx.amount;
        inMemoryWallet.pendingBalanceUSD = Math.max(0, inMemoryWallet.pendingBalanceUSD - tx.amount);
        inMemoryWallet.totalCollectedUSD += tx.amount;
    } else {
        inMemoryWallet.availableBalanceLRD += tx.amount;
        inMemoryWallet.pendingBalanceLRD = Math.max(0, inMemoryWallet.pendingBalanceLRD - tx.amount);
        inMemoryWallet.totalCollectedLRD += tx.amount;
    }
    inMemoryWallet.successfulCount += 1;
    inMemoryWallet.pendingCount = Math.max(0, inMemoryWallet.pendingCount - 1);
    inMemoryWallet.lastReconciliation = now;

    try {
        await prisma.$executeRawUnsafe(`
            UPDATE "DepositTransaction" 
            SET "status" = 'SUCCESSFUL', "customerPromptStatus" = 'PIN_ENTERED', "confirmedAt" = NOW(), "externalId" = COALESCE($1, "externalId")
            WHERE "id" = $2 OR "idempotencyKey" = $2
        `, externalId || null, tx.id);

        await prisma.$executeRawUnsafe(`
            UPDATE "CompanyWallet" 
            SET 
                "availableBalanceUSD" = "availableBalanceUSD" + (CASE WHEN $1 = 'USD' THEN $2 ELSE 0 END),
                "availableBalanceLRD" = "availableBalanceLRD" + (CASE WHEN $1 = 'LRD' THEN $2 ELSE 0 END),
                "pendingBalanceUSD" = GREATEST(0, "pendingBalanceUSD" - (CASE WHEN $1 = 'USD' THEN $2 ELSE 0 END)),
                "pendingBalanceLRD" = GREATEST(0, "pendingBalanceLRD" - (CASE WHEN $1 = 'LRD' THEN $2 ELSE 0 END)),
                "totalCollectedUSD" = "totalCollectedUSD" + (CASE WHEN $1 = 'USD' THEN $2 ELSE 0 END),
                "totalCollectedLRD" = "totalCollectedLRD" + (CASE WHEN $1 = 'LRD' THEN $2 ELSE 0 END),
                "lastReconciliation" = NOW(),
                "updatedAt" = NOW()
            WHERE "id" = 'primary_company_wallet'
        `, tx.currency, tx.amount);

        await prisma.$executeRawUnsafe(`
            UPDATE "Ride" 
            SET "depositStatus" = 'PAID', "paymentStatus" = 'DEPOSIT_PAID'
            WHERE "id" = $1
        `, tx.rideId);
    } catch (e) {
        console.warn("Notice: DB update for confirmed deposit skipped, stored in memory.", e);
    }

    return tx;
}

/**
 * Marks a deposit transaction as FAILED or CANCELLED.
 * Clears pending balance without touching the available wallet balance.
 */
export async function failDepositTransaction(txId: string, reason: string): Promise<DepositTransaction | null> {
    await ensurePaymentSchema();
    const tx = inMemoryTransactions.find(t => t.id === txId || t.idempotencyKey === txId);
    if (!tx) return null;

    if (tx.status === "SUCCESSFUL") {
        // Cannot fail an already completed transaction
        return tx;
    }

    tx.status = "FAILED";
    tx.customerPromptStatus = "REJECTED";
    tx.failureReason = reason;

    if (tx.currency === "USD") {
        inMemoryWallet.pendingBalanceUSD = Math.max(0, inMemoryWallet.pendingBalanceUSD - tx.amount);
    } else {
        inMemoryWallet.pendingBalanceLRD = Math.max(0, inMemoryWallet.pendingBalanceLRD - tx.amount);
    }
    inMemoryWallet.failedCount += 1;
    inMemoryWallet.pendingCount = Math.max(0, inMemoryWallet.pendingCount - 1);

    try {
        await prisma.$executeRawUnsafe(`
            UPDATE "DepositTransaction" 
            SET "status" = 'FAILED', "failureReason" = $1, "customerPromptStatus" = 'REJECTED'
            WHERE "id" = $2
        `, reason, tx.id);

        await prisma.$executeRawUnsafe(`
            UPDATE "Ride" SET "depositStatus" = 'FAILED' WHERE "id" = $1
        `, tx.rideId);
    } catch {}

    return tx;
}
