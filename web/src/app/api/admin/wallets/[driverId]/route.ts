/**
 * GET /api/admin/wallets/[driverId]
 * Returns full transaction history and wallet details for a specific driver
 */

import { NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { getDriverWallet } from "@/lib/walletService";

export async function GET(req: Request, { params }: { params: Promise<{ driverId: string }> }) {
    try {
        const payload = await verifyJWT(req);
        if (!payload || !["ADMIN", "SUPER_ADMIN"].includes(payload.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { driverId } = await params;
        if (!driverId) {
            return NextResponse.json({ error: "driverId is required" }, { status: 400 });
        }

        const { wallet, transactions } = await getDriverWallet(driverId);

        if (!wallet) {
            return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
        }

        return NextResponse.json({
            ...wallet,
            transactions,
        });
    } catch (error) {
        console.error("Admin wallet details GET error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
