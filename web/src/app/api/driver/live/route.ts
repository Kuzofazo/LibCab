/**
 * GET /api/driver/live?rideId=<rideId>
 *
 * Public (no auth required) endpoint that returns the live GPS position
 * of the driver assigned to a specific ride.
 *
 * Used as a polling fallback when the customer's SSE connection drops.
 * Returns minimal data only — no PII beyond what the customer already
 * has access to through the ride object.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const rideId = searchParams.get("rideId");

        if (!rideId) {
            return NextResponse.json({ error: "rideId is required" }, { status: 400 });
        }

        // Fetch the ride and its driver's current position
        const ride = await prisma.ride.findUnique({
            where: { id: rideId },
            select: {
                id: true,
                status: true,
                driverId: true,
                driver: {
                    select: {
                        id: true,
                        currentLat: true,
                        currentLng: true,
                        speed: true,
                        heading: true,
                        lastPing: true,
                        vehicleType: true,
                        vehicleModel: true,
                        vehicleColor: true,
                        licensePlate: true,
                        rating: true,
                        user: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
        });

        if (!ride) {
            return NextResponse.json({ error: "Ride not found" }, { status: 404 });
        }

        // Don't expose driver location for cancelled/completed rides
        if (["CANCELLED", "COMPLETED"].includes(ride.status)) {
            return NextResponse.json({
                rideId: ride.id,
                status: ride.status,
                driver: null,
                tracking: false,
            });
        }

        const driver = ride.driver;
        if (!driver) {
            return NextResponse.json({
                rideId: ride.id,
                status: ride.status,
                driver: null,
                tracking: false,
            });
        }

        // Determine if the last ping is recent enough to be useful (<30s)
        const lastPingAge = driver.lastPing
            ? Date.now() - new Date(driver.lastPing).getTime()
            : Infinity;
        const isLive = lastPingAge < 30_000;

        return NextResponse.json({
            rideId: ride.id,
            status: ride.status,
            tracking: isLive,
            driver: {
                id: driver.id,
                name: driver.user?.name || "Your Driver",
                vehicleType: driver.vehicleType,
                vehicleModel: driver.vehicleModel,
                vehicleColor: driver.vehicleColor,
                licensePlate: driver.licensePlate,
                rating: driver.rating,
                lat: driver.currentLat,
                lng: driver.currentLng,
                speed: driver.speed,
                heading: driver.heading,
                lastPing: driver.lastPing,
                isLive,
            },
        });
    } catch (error: any) {
        console.error("Driver live location API error:", error);
        return NextResponse.json(
            { error: "Failed to fetch driver location", details: error.message },
            { status: 500 }
        );
    }
}
