import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";
import { rideStreamManager } from "@/lib/sse";

export async function POST(req: Request) {
    try {
        const user = await verifyJWT();
        if (!user || user.role !== "DRIVER") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { lat, lng, imei, licensePlate, speed = 0, heading = 0, batteryLevel = 100, signalStrength = 100 } = body;

        if (typeof lat !== "number" || typeof lng !== "number") {
            return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
        }

        // Update DriverProfile with IMEI anchor & live telemetry
        const updatedProfile = await prisma.driverProfile.update({
            where: { userId: user.userId },
            data: {
                currentLat: lat,
                currentLng: lng,
                isOnline: true,
                speed: parseFloat(speed) || 0,
                heading: parseFloat(heading) || 0,
                batteryLevel: parseInt(batteryLevel) || 100,
                signalStrength: parseInt(signalStrength) || 100,
                lastPing: new Date(),
                ...(imei ? { imei } : {}),
                ...(licensePlate ? { licensePlate } : {}),
            },
            include: {
                user: { select: { name: true, phone: true, email: true } },
            },
        });

        // Record historical breadcrumb location log
        await prisma.locationLog.create({
            data: {
                driverId: updatedProfile.id,
                lat,
                lng,
                speed: parseFloat(speed) || 0,
                heading: parseFloat(heading) || 0,
                batteryLevel: parseInt(batteryLevel) || 100,
            },
        }).catch((err) => console.error("Failed to write location log:", err));

        // Check if driver has an active assigned ride
        const activeRide = await prisma.ride.findFirst({
            where: {
                driverId: updatedProfile.id,
                status: { in: ["ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS"] },
            },
            select: { id: true, status: true, originLat: true, originLng: true, destLat: true, destLng: true }
        });

        // Publish live SSE stream event for riders, admin and fleet dashboards
        rideStreamManager.publish({
            type: "LOCATION_UPDATED",
            driverId: updatedProfile.id,
            rideId: activeRide?.id,
            data: {
                driverId: updatedProfile.id,
                userId: user.userId,
                name: updatedProfile.user.name,
                vehicleType: updatedProfile.vehicleType,
                vehicleModel: updatedProfile.vehicleModel,
                licensePlate: updatedProfile.licensePlate,
                imei: updatedProfile.imei,
                lat,
                lng,
                speed: updatedProfile.speed,
                heading: updatedProfile.heading,
                batteryLevel: updatedProfile.batteryLevel,
                signalStrength: updatedProfile.signalStrength,
                lastPing: updatedProfile.lastPing,
                activeRideId: activeRide?.id,
                rideStatus: activeRide?.status,
            },
            timestamp: new Date().toISOString(),
        });

        return NextResponse.json({
            success: true,
            telemetry: {
                lat,
                lng,
                speed: updatedProfile.speed,
                heading: updatedProfile.heading,
                batteryLevel: updatedProfile.batteryLevel,
                imei: updatedProfile.imei,
                licensePlate: updatedProfile.licensePlate,
                lastPing: updatedProfile.lastPing,
            },
        });

    } catch (error: any) {
        console.error("Location telemetry ingestion error:", error);
        return NextResponse.json({ error: "Failed to update location", details: error.message }, { status: 500 });
    }
}
