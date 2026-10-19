import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Public unauthenticated endpoint to resolve live ride telemetry by secure shareToken
export async function GET(
    req: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params;
        if (!token || token.length < 8) {
            return NextResponse.json({ error: "Invalid share link" }, { status: 400 });
        }

        const ride = await prisma.ride.findUnique({
            where: { shareToken: token },
            select: {
                id: true,
                status: true,
                originAddress: true,
                destAddress: true,
                originLat: true,
                originLng: true,
                destLat: true,
                destLng: true,
                vehicleType: true,
                rideCategory: true,
                createdAt: true,
                startedAt: true,
                completedAt: true,
                sosAlert: true,
                shareExpiresAt: true,
                isSharingActive: true,
                // Stops
                stops: {
                    select: {
                        id: true,
                        sequence: true,
                        address: true,
                        lat: true,
                        lng: true,
                        status: true,
                    },
                    orderBy: { sequence: "asc" }
                },
                // Passenger first name only for privacy
                rider: { select: { name: true } },
                guestName: true,
                // Driver Details
                driver: {
                    select: {
                        vehicleType: true,
                        vehicleModel: true,
                        vehicleColor: true,
                        licensePlate: true,
                        rating: true,
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
            return NextResponse.json({ error: "Trip not found or link has expired." }, { status: 404 });
        }

        // Check if sharing is active
        if (!ride.isSharingActive) {
            return NextResponse.json({ error: "Live trip sharing has been stopped by the passenger." }, { status: 410 });
        }

        // Check if token has expired
        if (ride.shareExpiresAt && new Date() > new Date(ride.shareExpiresAt)) {
            return NextResponse.json({ error: "This trip sharing link has expired." }, { status: 410 });
        }

        // If completed more than 30 minutes ago, expire link
        if (ride.status === "COMPLETED" && ride.completedAt) {
            const completedDiffMs = Date.now() - new Date(ride.completedAt).getTime();
            if (completedDiffMs > 30 * 60 * 1000) {
                return NextResponse.json({ error: "This ride is completed and live tracking has ended." }, { status: 410 });
            }
        }

        // Sanitize passenger name (e.g. "Sarah" instead of full name or phone number)
        const rawName = ride.rider?.name || ride.guestName || "Passenger";
        const sanitizedPassenger = rawName.split(" ")[0];

        return NextResponse.json({
            id: ride.id,
            status: ride.status,
            originAddress: ride.originAddress,
            destAddress: ride.destAddress,
            originLat: ride.originLat,
            originLng: ride.originLng,
            destLat: ride.destLat,
            destLng: ride.destLng,
            vehicleType: ride.vehicleType,
            rideCategory: ride.rideCategory,
            createdAt: ride.createdAt,
            startedAt: ride.startedAt,
            completedAt: ride.completedAt,
            sosAlert: ride.sosAlert,
            passengerName: sanitizedPassenger,
            stops: ride.stops,
            driver: ride.driver ? {
                name: ride.driver.user?.name ? ride.driver.user.name.split(" ")[0] : "Verified Driver",
                vehicleModel: ride.driver.vehicleModel || "Sedan",
                vehicleColor: ride.driver.vehicleColor || "AfriCab Yellow",
                licensePlate: ride.driver.licensePlate || "Verified",
                rating: ride.driver.rating || 5.0,
                currentLat: ride.driver.currentLat,
                currentLng: ride.driver.currentLng,
                speed: ride.driver.speed,
                heading: ride.driver.heading
            } : null
        });
    } catch (error) {
        console.error("GET share token error:", error);
        return NextResponse.json({ error: "Failed to retrieve shared trip" }, { status: 500 });
    }
}
