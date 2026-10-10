import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";
import { DispatchEngine } from "@/services/dispatchEngine";

export async function POST(req: Request) {
    try {
        const user = await verifyJWT();
        if (!user || user.role !== "DRIVER") {
            return NextResponse.json({ error: "Unauthorized. Driver access only." }, { status: 401 });
        }

        const body = await req.json();
        const { rideId, driverPaymentPhone } = body;

        if (!rideId) {
            return NextResponse.json({ error: "rideId is required." }, { status: 400 });
        }

        const driverProfile = await prisma.driverProfile.findUnique({
            where: { userId: user.userId },
        });

        if (!driverProfile) {
            return NextResponse.json({ error: "Driver profile not found." }, { status: 404 });
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
