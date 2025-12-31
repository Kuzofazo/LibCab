import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
    try {
        const rides = await prisma.ride.findMany({
            include: {
                rider: { select: { name: true, email: true } },
                driver: { include: { user: { select: { name: true } } } },
            },
            orderBy: { createdAt: "desc" },
        });
        return NextResponse.json(rides);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch rides" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { riderId, originAddress, destAddress, originLat, originLng, destLat, destLng, vehicleType } = body;

        if (!riderId || !originAddress || !destAddress) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const newRide = await prisma.ride.create({
            data: {
                riderId,
                originAddress,
                destAddress,
                originLat: originLat || 0,
                originLng: originLng || 0,
                destLat: destLat || 0,
                destLng: destLng || 0,
                vehicleType: vehicleType || "Sedan",
                status: "REQUESTED",
                paymentStatus: "PENDING",
            },
            include: {
                rider: { select: { name: true } }
            }
        });

        return NextResponse.json(newRide);
    } catch (error) {
        console.error("Ride creation error:", error);
        return NextResponse.json({ error: "Failed to create ride" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const { id, status, driverId, paymentStatus } = body;

        if (!id) {
            return NextResponse.json({ error: "Ride ID is required" }, { status: 400 });
        }

        const updatedRide = await prisma.ride.update({
            where: { id },
            data: {
                status: status || undefined,
                driverId: driverId || undefined,
                paymentStatus: paymentStatus || undefined,
            },
            include: {
                rider: { select: { name: true } },
                driver: { include: { user: { select: { name: true } } } },
            }
        });

        return NextResponse.json(updatedRide);
    } catch (error) {
        return NextResponse.json({ error: "Update failed" }, { status: 400 });
    }
}
