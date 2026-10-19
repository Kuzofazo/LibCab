/**
 * POST /api/driver/wallet/fund
 * Initiates a wallet funding request via MTN or Orange Money (sandbox mode).
 * In sandbox: marks as SUCCESS immediately with a simulated reference.
 * In production: would initiate actual mobile money push request.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";
import { ensureDriverWallet, creditWallet, getDriverWallet } from "@/lib/walletService";
import { rideStreamManager } from "@/lib/sse";

export async function POST(req: Request) {
    try {
        const payload = await verifyJWT(req);
        if (!payload || payload.role !== "DRIVER") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { amount, provider, phoneNumber } = body;

        if (!amount || parseFloat(amount) <= 0) {
            return NextResponse.json({ error: "Invalid amount. Must be greater than 0." }, { status: 400 });
        }
        if (!provider || !["MTN", "ORANGE"].includes(provider)) {
            return NextResponse.json({ error: "Invalid payment provider. Use MTN or ORANGE." }, { status: 400 });
        }
        if (!phoneNumber) {
            return NextResponse.json({ error: "Payment phone number is required" }, { status: 400 });
        }

        let driverProfileId = payload.userId;

        try {
            const driverProfile = await prisma.driverProfile.findUnique({
                where: { userId: payload.userId },
                select: { id: true },
            });
            if (driverProfile) {
                driverProfileId = driverProfile.id;
            }
        } catch {}

        await ensureDriverWallet(driverProfileId, {
            userId: payload.userId,
            email: payload.email,
        });

        // Check if real API credentials are configured in systemConfig
        let isSandbox = true;
        try {
            const configs = await prisma.systemConfig.findMany({
                where: { key: { in: ["mtn.apiKey", "orange.apiKey"] } }
            });
            const configMap: Record<string, string> = {};
            for (const c of configs) configMap[c.key] = c.value;
            isSandbox = !configMap[`${provider.toLowerCase()}.apiKey`] ||
                configMap[`${provider.toLowerCase()}.apiKey`] === "SANDBOX";
        } catch {}

        const externalRef = isSandbox
            ? `SANDBOX-${provider}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
            : null;

        if (isSandbox) {
            // Sandbox: Credit immediately with simulated reference
            const txn = await creditWallet({
                driverProfileId,
                amount: parseFloat(amount),
                category: "FUNDING",
                provider,
                externalRef: externalRef!,
                idempotencyKey: `fund-${provider}-${payload.userId}-${Date.now()}`,
                note: `[SANDBOX] ${provider} wallet top-up from ${phoneNumber}`,
            });

            const { wallet: updatedWallet } = await getDriverWallet(driverProfileId);

            // Broadcast wallet update via SSE
            try {
                rideStreamManager.publish({
                    type: "WALLET_UPDATED",
                    driverId: driverProfileId,
                    data: {
                        driverId: driverProfileId,
                        balance: updatedWallet?.balance ?? txn.balanceAfter,
                        amount: parseFloat(amount),
                        provider,
                        externalRef,
                    },
                    timestamp: new Date().toISOString(),
                });
            } catch {}

            return NextResponse.json({
                success: true,
                sandbox: true,
                message: `[SANDBOX] ${parseFloat(amount).toFixed(2)} LRD successfully credited to your wallet via ${provider} Mobile Money.`,
                transaction: txn,
                newBalance: updatedWallet?.balance ?? txn.balanceAfter,
                reference: externalRef,
            });
        }

        // Production: Would initiate MoMo push here
        return NextResponse.json({
            success: false,
            error: "Live payment integration credentials not yet configured. Please contact the administrator.",
        }, { status: 503 });

    } catch (error) {
        console.error("Wallet fund error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
