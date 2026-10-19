import { NextResponse } from "next/server";
import { getDepositByRideId } from "@/lib/paymentDb";
import { confirmCustomerDeposit, initiateRideDeposit } from "@/services/mobileMoneyService";
import { prisma } from "@/lib/db";

/**
 * GET /api/rides/[id]/deposit
 * Returns deposit status, amount, and authorization state for a specific ride.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        if (!id) return NextResponse.json({ error: "Ride ID required" }, { status: 400 });

        const deposit = await getDepositByRideId(id);
        if (!deposit) {
            return NextResponse.json({ depositStatus: "NOT_REQUIRED" });
        }

        return NextResponse.json(deposit);
    } catch (error: any) {
        console.error("Fetch deposit error:", error);
        return NextResponse.json({ error: "Failed to fetch ride deposit status" }, { status: 500 });
    }
}

/**
 * POST /api/rides/[id]/deposit
 * Handles customer PIN authorization or retry for the active ride's deposit.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        if (!id) return NextResponse.json({ error: "Ride ID required" }, { status: 400 });

        const body = await req.json().catch(() => ({}));
        const { action, pin } = body;

        let deposit = await getDepositByRideId(id);

        if (action === "RETRY" || !deposit) {
            // Re-initiate if requested or missing
            const ride = await prisma.ride.findUnique({
                where: { id },
                include: { rider: true, driver: { include: { user: true } } }
            }).catch(() => null);

            if (!ride) {
                return NextResponse.json({ error: "Ride not found" }, { status: 404 });
            }

            const res = await initiateRideDeposit({
                rideId: id,
                fare: ride.fare || 10,
                paymentMethod: ride.paymentMethod || "MOMO",
                customerPhone: ride.customerPaymentPhone || ride.rider?.phone || "+231 88 012 3456",
                customerName: ride.guestName || ride.rider?.name || "Rider",
                driverName: ride.driver?.user?.name || "Driver",
            });

            deposit = res.transaction;
        }

        if (action === "AUTHORIZE" || action === "PIN_SUBMIT") {
            // Customer authorized via handset or sandbox PIN prompt
            if (!deposit) {
                return NextResponse.json({ error: "No pending deposit found" }, { status: 404 });
            }

            const externalRef = `AUTH-PIN-${Date.now().toString(36).toUpperCase()}`;
            const result = await confirmCustomerDeposit(deposit.id, externalRef);

            return NextResponse.json({
                message: "Deposit payment successfully authorized! Company wallet credited.",
                deposit: result.transaction
            });
        }

        return NextResponse.json(deposit);
    } catch (error: any) {
        console.error("Deposit authorization error:", error);
        return NextResponse.json({ error: "Failed to process deposit authorization" }, { status: 500 });
    }
}
