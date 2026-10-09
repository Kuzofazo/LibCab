import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Public unauthenticated endpoint for "Share My Ride" tracking
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: "Ride ID is required" }, { status: 400 });
        }

        const ride = await prisma.ride.findUnique({
            where: { id },
            select: {
                id: true,
                status: true,
                originAddress: true,
                destAddress: true,
                originLat: true,
                originLng: true,
                destLat: true,
                destLng: true,
                fare: true,
                vehicleType: true,
                rideCategory: true,
                createdAt: true,
                startedAt: true,
                completedAt: true,
                sosAlert: true,
                // Sanitized passenger info (first name only)
                rider: {
                    select: {
                        name: true
                    }
                },
                guestName: true,
                // Driver Details
                driver: {
                    select: {
                        id: true,
                        vehicleType: true,
                        vehicleModel: true,
                        vehicleColor: true,
                        licensePlate: true,
                        rating: true,
                        reviewCount: true,
                        currentLat: true,
                        currentLng: true,
                        speed: true,
                        heading: true,
                        user: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            }
        });

        if (!ride) {
            return NextResponse.json({ error: "Ride not found or expired" }, { status: 404 });
        }

        // Sanitize passenger name to protect privacy
        const rawName = ride.rider?.name || ride.guestName || "Passenger";
        const passengerDisplayName = rawName.split(" ")[0];

        return NextResponse.json({
            id: ride.id,
            status: ride.status,
            originAddress: ride.originAddress,
            destAddress: ride.destAddress,
            originLat: ride.originLat,
            originLng: ride.originLng,
            destLat: ride.destLat,
            destLng: ride.destLng,
            fare: ride.fare,
            vehicleType: ride.vehicleType,
            rideCategory: ride.rideCategory,
            createdAt: ride.createdAt,
            startedAt: ride.startedAt,
            completedAt: ride.completedAt,
            sosAlert: ride.sosAlert,
            passengerName: passengerDisplayName,
            driver: ride.driver ? {
                name: ride.driver.user?.name || "Verified AfriCab Driver",
                vehicleModel: ride.driver.vehicleModel || "AfriCab Sedan",
                vehicleColor: ride.driver.vehicleColor || "Standard",
                licensePlate: ride.driver.licensePlate || "Verified",
                rating: ride.driver.rating || 5.0,
                reviewCount: ride.driver.reviewCount || 0,
                currentLat: ride.driver.currentLat || ride.originLat,
                currentLng: ride.driver.currentLng || ride.originLng,
                speed: ride.driver.speed || 0,
                heading: ride.driver.heading || 0
            } : null
        });
    } catch (error) {
        console.error("Public ride tracking error:", error);
        return NextResponse.json({ error: "Failed to fetch ride status" }, { status: 500 });
    }
}
