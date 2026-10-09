import { prisma } from "@/lib/db";
import { findNearbyDrivers } from "@/lib/geo";
import { rideStreamManager } from "@/lib/sse";

export class DispatchEngine {
    /**
     * Auto-match pending REQUESTED ride to closest online driver or registered driver profile
     */
    public static async autoDispatchRide(rideId: string, delayMs = 1500): Promise<boolean> {
        try {
            if (delayMs > 0) {
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            }

            const ride = await prisma.ride.findUnique({
                where: { id: rideId },
            });

            if (!ride || (ride.status !== "REQUESTED" && ride.status !== "PENDING") || ride.driverId) {
                return false;
            }

            // 1. Fetch online drivers
            const onlineDrivers = await prisma.driverProfile.findMany({
                where: { isOnline: true },
                select: {
                    id: true,
                    userId: true,
                    currentLat: true,
                    currentLng: true,
                    rating: true,
                    isOnline: true,
                },
            });

            const formattedDrivers = onlineDrivers
                .filter((d) => d.currentLat !== null && d.currentLng !== null)
                .map((d) => ({
                    id: d.id,
                    userId: d.userId,
                    lat: d.currentLat!,
                    lng: d.currentLng!,
                    rating: d.rating,
                    isOnline: d.isOnline,
                }));

            const nearby = findNearbyDrivers(ride.originLat || 6.3156, ride.originLng || -10.8074, formattedDrivers, 25);

            let chosenDriverId: string | null = null;

            if (nearby.length > 0) {
                chosenDriverId = nearby[0].id;
            } else {
                // Fallback: match with any registered driver in the system
                const anyDriver = await prisma.driverProfile.findFirst({
                    where: { isApproved: true },
                    include: { user: true }
                }) || await prisma.driverProfile.findFirst({
                    include: { user: true }
                });

                if (anyDriver) {
                    chosenDriverId = anyDriver.id;
                }
            }

            if (chosenDriverId) {
                const updatedRide = await prisma.ride.update({
                    where: { id: rideId },
                    data: {
                        driverId: chosenDriverId,
                        status: "ACCEPTED",
                    },
                    include: {
                        rider: { select: { name: true, phone: true } },
                        driver: { include: { user: { select: { name: true, phone: true } } } },
                    },
                });

                // Create Dispatcher Log for Admin Notification
                try {
                    await prisma.dispatcherLog.create({
                        data: {
                            action: "RIDE_ACCEPTED",
                            details: JSON.stringify({
                                rideId: updatedRide.id,
                                driverId: chosenDriverId,
                                driverName: updatedRide.driver?.user?.name || "Driver",
                                clientName: updatedRide.rider?.name || updatedRide.guestName || "Client",
                                originAddress: updatedRide.originAddress,
                                destAddress: updatedRide.destAddress,
                                autoDispatched: true
                            })
                        }
                    });
                } catch {
                    // Non-blocking dispatch log error
                }

                // Publish real-time event via SSE stream
                rideStreamManager.publish({
                    type: "RIDE_ACCEPTED",
                    rideId: updatedRide.id,
                    driverId: chosenDriverId,
                    data: updatedRide,
                    timestamp: new Date().toISOString(),
                });

                return true;
            }

            return false;
        } catch (error) {
            console.error("Auto dispatch error:", error);
            return false;
        }
    }
}
