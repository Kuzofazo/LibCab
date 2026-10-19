/**
 * Admin Driver Wallets API
 * GET  /api/admin/wallets               - List all driver wallets + balances + stats
 * POST /api/admin/wallets/config        - Update min balance & deposit settings
 * POST /api/admin/wallets/adjust        - Admin manual wallet adjustment
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";
import {
    listAllWallets,
    updateWalletConfig,
    adminAdjustWallet,
    setWalletStatus,
    ensureDriverWallet,
} from "@/lib/walletService";

export async function GET(req: Request) {
    try {
        const payload = await verifyJWT(req);
        if (!payload || !["ADMIN", "SUPER_ADMIN"].includes(payload.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") ?? "1");
        const limit = parseInt(searchParams.get("limit") ?? "50");
        const filter = searchParams.get("filter") ?? "ALL"; // ALL, ELIGIBLE, INELIGIBLE, SUSPENDED
        const search = searchParams.get("search") ?? "";

        const result = await listAllWallets(filter, search);

        // Check if there are drivers in DB without wallets
        let driversWithoutWallets: any[] = [];
        try {
            const approvedWithoutWallets = await prisma.driverProfile.findMany({
                where: {
                    approvalStatus: "APPROVED",
                    wallet: null,
                },
                include: {
                    user: { select: { id: true, name: true, email: true, phone: true } },
                },
                take: 20,
            });
            driversWithoutWallets = approvedWithoutWallets.map(d => ({
                id: d.id,
                user: d.user,
            }));
        } catch {}

        const stats = {
            ...result.stats,
            driversWithoutWallets: driversWithoutWallets.length,
        };

        // Pagination
        const skip = (page - 1) * limit;
        const paged = result.wallets.slice(skip, skip + limit);

        return NextResponse.json({
            wallets: paged,
            driversWithoutWallets,
            stats,
            config: result.config,
            pagination: { page, limit, total: result.wallets.length, pages: Math.ceil(result.wallets.length / limit) },
        });
    } catch (error) {
        console.error("Admin wallets GET error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const payload = await verifyJWT(req);
        if (!payload || !["ADMIN", "SUPER_ADMIN"].includes(payload.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { action } = body;

        if (action === "UPDATE_CONFIG") {
            const { minBalance, depositAmount, depositMode, depositPercent } = body;
            const updated = await updateWalletConfig({
                minBalance: minBalance !== undefined ? parseFloat(minBalance) : undefined,
                depositAmount: depositAmount !== undefined ? parseFloat(depositAmount) : undefined,
                depositMode: depositMode || undefined,
                depositPercent: depositPercent !== undefined ? parseFloat(depositPercent) : undefined,
            });

            // Audit log
            try {
                await prisma.dispatcherLog.create({
                    data: {
                        dispatcherId: payload.userId,
                        action: "WALLET_CONFIG_UPDATED",
                        details: JSON.stringify({ updated, adminId: payload.userId }),
                    },
                });
            } catch {}

            return NextResponse.json({
                success: true,
                message: "Wallet configuration updated successfully.",
                config: updated,
            });
        }

        if (action === "ADJUST_WALLET") {
            const { driverProfileId, amount, note } = body;
            if (!driverProfileId || amount === undefined || !note) {
                return NextResponse.json({ error: "driverProfileId, amount, and note are required." }, { status: 400 });
            }
            if (amount === 0) {
                return NextResponse.json({ error: "Adjustment amount cannot be zero." }, { status: 400 });
            }

            const txn = await adminAdjustWallet({
                driverProfileId,
                amount: parseFloat(amount),
                note,
                adminUserId: payload.userId,
            });

            // Audit log
            try {
                await prisma.dispatcherLog.create({
                    data: {
                        dispatcherId: payload.userId,
                        action: "WALLET_ADJUSTED",
                        details: JSON.stringify({ driverProfileId, amount, note, adminId: payload.userId }),
                    },
                });
            } catch {}

            return NextResponse.json({
                success: true,
                transaction: txn,
                newBalance: txn.balanceAfter,
                message: `Wallet adjusted by ${amount > 0 ? "+" : ""}${amount} LRD.`,
            });
        }

        if (action === "SUSPEND_WALLET") {
            const { driverProfileId } = body;
            await setWalletStatus(driverProfileId, "SUSPENDED");

            try {
                await prisma.dispatcherLog.create({
                    data: {
                        dispatcherId: payload.userId,
                        action: "WALLET_SUSPENDED",
                        details: JSON.stringify({ driverProfileId, adminId: payload.userId }),
                    },
                });
            } catch {}

            return NextResponse.json({ success: true, message: "Wallet suspended successfully." });
        }

        if (action === "ACTIVATE_WALLET") {
            const { driverProfileId } = body;
            await setWalletStatus(driverProfileId, "ACTIVE");

            try {
                await prisma.dispatcherLog.create({
                    data: {
                        dispatcherId: payload.userId,
                        action: "WALLET_ACTIVATED",
                        details: JSON.stringify({ driverProfileId, adminId: payload.userId }),
                    },
                });
            } catch {}

            return NextResponse.json({ success: true, message: "Wallet activated successfully." });
        }

        if (action === "CREATE_WALLET") {
            const { driverProfileId } = body;
            const wallet = await ensureDriverWallet(driverProfileId);
            return NextResponse.json({ success: true, wallet });
        }

        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    } catch (error) {
        console.error("Admin wallets POST error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
