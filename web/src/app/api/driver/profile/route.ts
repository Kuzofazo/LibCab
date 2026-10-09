import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";

export async function GET() {
    try {
        const payload = await verifyJWT();

        if (!payload || payload.role !== "DRIVER") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const driverProfile = await prisma.driverProfile.findUnique({
            where: { userId: payload.userId },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        phone: true
                    }
                }
            }
        });

        if (!driverProfile) {
            return NextResponse.json({ error: "Driver profile not found" }, { status: 404 });
        }

        return NextResponse.json(driverProfile);
    } catch (error) {
        console.error("Driver Profile Fetch Error", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const payload = await verifyJWT();

        if (!payload || payload.role !== "DRIVER") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { isOnline, vehicleType, vehicleModel, vehicleColor, licensePlate } = body;

        const updatedProfile = await prisma.driverProfile.update({
            where: { userId: payload.userId },
            data: {
                ...(typeof isOnline === "boolean" ? { isOnline } : {}),
                ...(vehicleType !== undefined ? { vehicleType } : {}),
                ...(vehicleModel !== undefined ? { vehicleModel } : {}),
                ...(vehicleColor !== undefined ? { vehicleColor } : {}),
                ...(licensePlate !== undefined ? { licensePlate } : {}),
                lastPing: new Date()
            },
            include: {
                user: { select: { name: true, email: true, phone: true } }
            }
        });

        // Broadcast driver status update via SSE stream
        try {
            const { rideStreamManager } = await import("@/lib/sse");
            rideStreamManager.publish({
                type: updatedProfile.isOnline ? "DRIVER_ONLINE" : "DRIVER_OFFLINE",
                driverId: updatedProfile.id,
                data: {
                    driverId: updatedProfile.id,
                    userId: payload.userId,
                    name: updatedProfile.user.name,
                    isOnline: updatedProfile.isOnline,
                    lat: updatedProfile.currentLat,
                    lng: updatedProfile.currentLng,
                    licensePlate: updatedProfile.licensePlate
                },
                timestamp: new Date().toISOString()
            });
        } catch {
            // Non-blocking SSE broadcast error
        }

        return NextResponse.json(updatedProfile);
    } catch (error: unknown) {
        console.error("Driver Profile Update Error", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: "Failed to update profile", details: message }, { status: 500 });
    }
}
