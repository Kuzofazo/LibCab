/**
 * GET  /api/driver/wallet - Get driver's own wallet + recent transactions + eligibility
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";
import {
    ensureDriverWallet,
    getDriverWallet,
    getWalletConfig,
    checkDriverEligibility
} from "@/lib/walletService";

export async function GET(req: Request) {
    try {
        const payload = await verifyJWT(req);
        if (!payload || payload.role !== "DRIVER") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        let driverProfileId = payload.userId;

        // Try to look up driver profile from DB
        try {
            const driverProfile = await prisma.driverProfile.findUnique({
                where: { userId: payload.userId },
                select: { id: true, approvalStatus: true },
            });
            if (driverProfile) {
                driverProfileId = driverProfile.id;
            }
        } catch {}

        // Ensure wallet exists
        await ensureDriverWallet(driverProfileId, {
            userId: payload.userId,
            email: payload.email,
        });

        const [{ wallet, transactions }, config, eligibility] = await Promise.all([
            getDriverWallet(driverProfileId),
            getWalletConfig(),
            checkDriverEligibility(driverProfileId),
        ]);

        return NextResponse.json({
            wallet: wallet ? { ...wallet, transactions } : null,
            config,
            eligible: eligibility.eligible,
            minBalance: eligibility.minBalance,
            shortfall: eligibility.shortfall,
            balance: eligibility.balance,
            status: eligibility.walletStatus,
        });
    } catch (error) {
        console.error("Driver wallet GET error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
