import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";
import { DispatchEngine } from "@/services/dispatchEngine";

export async function POST(req: Request) {
    try {
        const user = await verifyJWT(req);
        if (!user || user.role !== "DRIVER") {
            return NextResponse.json({ error: "Unauthorized. Driver access only." }, { status: 401 });
        }

        const body = await req.json();
        const { rideId, driverPaymentPhone } = body;

        if (!rideId) {
            return NextResponse.json({ error: "rideId is required." }, { status: 400 });
        }

        let driverProfile = await prisma.driverProfile.findUnique({
            where: { userId: user.userId },
        });

        if (!driverProfile || (driverProfile.approvalStatus && driverProfile.approvalStatus !== "APPROVED")) {
            return NextResponse.json({ 
                error: "Your driver account is pending review or not approved. You cannot accept rides.",
                code: "DRIVER_NOT_APPROVED",
                approvalStatus: driverProfile?.approvalStatus || "PENDING"
            }, { status: 403 });
        }

        if (!driverProfile.isOnline) {
            driverProfile = await prisma.driverProfile.update({
                where: { id: driverProfile.id },
                data: { isOnline: true }
            });
        }

        // Validate driver wallet eligibility before allowing ride acceptance
        const { checkDriverEligibility, ensureDriverWallet } = await import("@/lib/walletService");
        await ensureDriverWallet(driverProfile.id, {
            userId: user.userId,
            email: user.email,
        });
        const eligibility = await checkDriverEligibility(driverProfile.id);
        if (!eligibility.eligible) {
            return NextResponse.json({
                error: `Insufficient Wallet Balance. Your balance is ${eligibility.balance.toFixed(2)} LRD. You need at least ${eligibility.minBalance.toFixed(2)} LRD to accept rides. Please fund your wallet to continue.`,
                code: "INSUFFICIENT_WALLET_BALANCE",
                balance: eligibility.balance,
                minBalance: eligibility.minBalance,
                shortfall: eligibility.shortfall,
            }, { status: 402 });
        }

        const result = await DispatchEngine.acceptRideOffer(
            rideId,
            driverProfile.id,
            driverPaymentPhone
        );

        if (!result.success) {
            return NextResponse.json(
                { error: result.message, code: result.code },
                { status: result.code === "ALREADY_TAKEN" ? 409 : 400 }
            );
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("Ride acceptance API error:", error);
        return NextResponse.json({ error: "Failed to accept ride" }, { status: 500 });
    }
}
