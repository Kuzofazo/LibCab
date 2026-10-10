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
        const { rideId } = body;

        if (!rideId) {
            return NextResponse.json({ error: "rideId is required." }, { status: 400 });
        }

        const driverProfile = await prisma.driverProfile.findUnique({
            where: { userId: user.userId },
        });

        if (!driverProfile) {
            return NextResponse.json({ error: "Driver profile not found." }, { status: 404 });
        }

        const result = await DispatchEngine.declineRideOffer(rideId, driverProfile.id);

        return NextResponse.json(result);
    } catch (error) {
        console.error("Ride decline API error:", error);
        return NextResponse.json({ error: "Failed to decline ride" }, { status: 500 });
    }
}
