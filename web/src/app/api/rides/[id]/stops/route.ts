import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";
import { rideStreamManager } from "@/lib/sse";

// GET all stops for a ride
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: rideId } = await params;
        const stops = await prisma.rideStop.findMany({
            where: { rideId },
            orderBy: { sequence: "asc" }
        });
        return NextResponse.json(stops);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch ride stops" }, { status: 500 });
    }
}

// POST: Add a new stop (pre-trip or mid-trip)
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await verifyJWT(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: rideId } = await params;
        const body = await req.json();
        const { address, lat, lng } = body;

        if (!address) {
            return NextResponse.json({ error: "Stop address is required" }, { status: 400 });
        }

        const ride = await prisma.ride.findUnique({
            where: { id: rideId },
            include: {
                stops: { orderBy: { sequence: "asc" } },
                driver: { include: { user: true } },
                rider: true
            }
        });

        if (!ride) {
            return NextResponse.json({ error: "Ride not found" }, { status: 404 });
        }

        // Only allowed if trip is not completed or cancelled
        if (["COMPLETED", "CANCELLED"].includes(ride.status)) {
            return NextResponse.json({ error: "Cannot add stops to a completed or cancelled ride." }, { status: 400 });
        }

        // Limit to max 4 intermediate stops
        if (ride.stops.length >= 4) {
            return NextResponse.json({ error: "Maximum of 4 intermediate stops allowed per trip." }, { status: 400 });
        }

        const nextSequence = ride.stops.length + 1;

        // Base incremental fare per added stop (USD 2.50 or LRD 475)
        const stopAdditionFee = 2.50;
        const newFare = (ride.fare || 25.0) + stopAdditionFee;

        const newStop = await prisma.rideStop.create({
            data: {
                rideId,
                sequence: nextSequence,
                address,
                lat: lat || 0,
                lng: lng || 0,
                status: "PENDING"
            }
        });

        // Update ride with updated fare
        const updatedRide = await prisma.ride.update({
            where: { id: rideId },
            data: {
                fare: newFare
            },
            include: {
                stops: { orderBy: { sequence: "asc" } },
                driver: { include: { user: true } },
                rider: { select: { id: true, name: true, phone: true } }
            }
        });

        // Broadcast to both Rider and Driver screens in real-time
        rideStreamManager.publish({
            type: "RIDE_UPDATED",
            rideId: ride.id,
            driverId: ride.driverId || undefined,
            data: updatedRide,
            timestamp: new Date().toISOString()
        });

        return NextResponse.json({
            message: "Stop added successfully",
            stop: newStop,
            newFare,
            ride: updatedRide
        }, { status: 201 });
    } catch (error: any) {
        console.error("Add stop error:", error);
        return NextResponse.json({ error: error.message || "Failed to add stop" }, { status: 500 });
    }
}

// PATCH: Update stop status (ARRIVED, COMPLETED, SKIPPED)
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await verifyJWT(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: rideId } = await params;
        const body = await req.json();
        const { stopId, status } = body;

        if (!stopId || !status) {
            return NextResponse.json({ error: "stopId and status are required" }, { status: 400 });
        }

        const updateData: any = { status };
        if (status === "ARRIVED") updateData.arrivedAt = new Date();
        if (status === "COMPLETED") updateData.completedAt = new Date();

        const updatedStop = await prisma.rideStop.update({
            where: { id: stopId },
            data: updateData
        });

        const ride = await prisma.ride.findUnique({
            where: { id: rideId },
            include: {
                stops: { orderBy: { sequence: "asc" } },
                driver: { include: { user: true } },
                rider: { select: { id: true, name: true, phone: true } }
            }
        });

        if (ride) {
            rideStreamManager.publish({
                type: "RIDE_UPDATED",
                rideId: ride.id,
                driverId: ride.driverId || undefined,
                data: ride,
                timestamp: new Date().toISOString()
            });
        }

        return NextResponse.json({ stop: updatedStop, ride });
    } catch (error: any) {
        console.error("Update stop status error:", error);
        return NextResponse.json({ error: error.message || "Failed to update stop status" }, { status: 500 });
    }
}
