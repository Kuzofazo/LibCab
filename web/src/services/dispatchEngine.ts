import { prisma } from "@/lib/db";
import { calculateDistanceKm, calculateEtaMinutes } from "@/lib/geo";
import { rideStreamManager } from "@/lib/sse";
import { PushNotificationService, RidePushDetails } from "./pushNotificationService";

export interface MatchedDriver {
    id: string;
    userId: string;
    name: string;
    phone: string | null;
    currentLat: number;
    currentLng: number;
    distanceKm: number;
    etaMinutes: number;
    rating: number;
    vehicleType: string | null;
    vehicleModel: string | null;
    licensePlate: string | null;
    pushToken: string | null;
    fcmToken: string | null;
    devicePlatform: string | null;
    soundEnabled: boolean;
    vibrationEnabled: boolean;
}

export function isVehicleTypeCompatible(requested?: string | null, offered?: string | null): boolean {
    if (!requested || requested === "Any" || !offered) return true;
    const req = requested.toLowerCase().trim();
    const off = offered.toLowerCase().trim();
    if (req === off) return true;

    // Car / Taxi / Sedan / Standard / Comfort / VIP compatibility
    const carTypes = ["car", "sedan", "taxi", "standard", "comfort", "vip", "suv"];
    if (carTypes.includes(req) && carTypes.includes(off)) return true;

    // Bike / Motorbike compatibility
    const bikeTypes = ["bike", "motorbike", "motorcycle"];
    if (bikeTypes.includes(req) && bikeTypes.includes(off)) return true;

    // Tricycle / Keke compatibility
    const trikeTypes = ["tricycle", "keke", "tuktuk"];
    if (trikeTypes.includes(req) && trikeTypes.includes(off)) return true;

    return false;
}

export class DispatchEngine {
    /**
     * Default service radius in kilometers (can be overridden per ride or driver preference)
     */
    public static readonly DEFAULT_SERVICE_RADIUS_KM = 12.0;

    /**
     * Window in seconds during which a driver can accept a ride before offer expires
     */
    public static readonly OFFER_EXPIRATION_SECONDS = 45;

    /**
     * Query and match eligible online nearby drivers for a given pickup location
     */
    public static async findEligibleNearbyDrivers(
        pickupLat: number,
        pickupLng: number,
        requestedVehicleType?: string | null,
        maxRadiusKm: number = DispatchEngine.DEFAULT_SERVICE_RADIUS_KM
    ): Promise<MatchedDriver[]> {
        try {
            // 1. Fetch drivers that are online, approved (or default), and not on an active recent trip
            const availableDrivers = await prisma.driverProfile.findMany({
                where: {
                    isOnline: true,
                    OR: [
                        { approvalStatus: "APPROVED" },
                        { approvalStatus: null },
                    ],
                    // Driver must not have an active ride in progress in the last 12 hours
                    rides: {
                        none: {
                            status: { in: ["ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS"] },
                            createdAt: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) },
                        },
                    },
                },
                include: {
                    user: {
                        select: { name: true, phone: true, email: true },
                    },
                },
            });

            // Filter drivers by wallet balance eligibility:
            // Allow drivers unless explicitly suspended or negative balance
            const { checkDriverEligibility } = await import("@/lib/walletService");
            const eligibleDrivers: typeof availableDrivers = [];
            for (const d of availableDrivers) {
                try {
                    const el = await checkDriverEligibility(d.id);
                    // Only block drivers explicitly suspended/frozen or with negative balance
                    // Treat undefined balance (no wallet yet) as 0 — allowed
                    const balance = typeof el.balance === "number" ? el.balance : 0;
                    if (el.walletStatus !== "SUSPENDED" && el.walletStatus !== "FROZEN" && balance >= 0) {
                        eligibleDrivers.push(d);
                    }
                } catch {
                    eligibleDrivers.push(d);
                }
            }

            const matched: MatchedDriver[] = [];

            for (const driver of eligibleDrivers) {
                const driverLat = (driver.currentLat !== null && driver.currentLat !== undefined && driver.currentLat !== 0)
                    ? driver.currentLat
                    : 6.3156;
                const driverLng = (driver.currentLng !== null && driver.currentLng !== undefined && driver.currentLng !== 0)
                    ? driver.currentLng
                    : -10.8074;

                const distanceKm = calculateDistanceKm(
                    pickupLat,
                    pickupLng,
                    driverLat,
                    driverLng
                );

                const driverMaxRadius = driver.maxDispatchRadiusKm || maxRadiusKm;

                // Within service radius check
                if (distanceKm <= driverMaxRadius) {
                    if (!isVehicleTypeCompatible(requestedVehicleType, driver.vehicleType)) {
                        continue;
                    }

                    const etaMinutes = calculateEtaMinutes(distanceKm);

                    matched.push({
                        id: driver.id,
                        userId: driver.userId,
                        name: driver.user?.name || "Driver",
                        phone: driver.user?.phone || null,
                        currentLat: driverLat,
                        currentLng: driverLng,
                        distanceKm,
                        etaMinutes,
                        rating: driver.rating,
                        vehicleType: driver.vehicleType,
                        vehicleModel: driver.vehicleModel,
                        licensePlate: driver.licensePlate,
                        pushToken: driver.pushToken,
                        fcmToken: driver.fcmToken,
                        devicePlatform: driver.devicePlatform,
                        soundEnabled: driver.soundEnabled !== false,
                        vibrationEnabled: driver.vibrationEnabled !== false,
                    });
                }
            }

            // Sort by proximity: closest driver first
            matched.sort((a, b) => a.distanceKm - b.distanceKm);

            return matched;
        } catch (error) {
            console.error("Error finding eligible drivers:", error);
            return [];
        }
    }

    /**
     * Broadcast ride request to nearby drivers via High-Priority Push Notification and SSE
     */
    public static async broadcastRideOffers(rideId: string): Promise<{
        offeredCount: number;
        drivers: MatchedDriver[];
    }> {
        try {
            const ride = await prisma.ride.findUnique({
                where: { id: rideId },
                include: {
                    rider: { select: { name: true, phone: true } },
                },
            });

            if (!ride || ride.status !== "REQUESTED" || ride.driverId) {
                return { offeredCount: 0, drivers: [] };
            }

            const originLat = ride.originLat || 6.3156;
            const originLng = ride.originLng || -10.8074;

            // Match eligible nearby drivers within service radius
            const nearbyDrivers = await this.findEligibleNearbyDrivers(
                originLat,
                originLng,
                ride.vehicleType,
                DispatchEngine.DEFAULT_SERVICE_RADIUS_KM
            );

            if (nearbyDrivers.length === 0) {
                console.log(`No online drivers available within radius for ride ${rideId}`);
                return { offeredCount: 0, drivers: [] };
            }

            // Expiration timestamp for this round of offers
            const expiresAt = new Date(Date.now() + DispatchEngine.OFFER_EXPIRATION_SECONDS * 1000);

            // Create RideOffer records in database for all matched drivers
            for (const driver of nearbyDrivers) {
                await prisma.rideOffer.upsert({
                    where: {
                        rideId_driverId: {
                            rideId: ride.id,
                            driverId: driver.id,
                        },
                    },
                    update: {
                        status: "PENDING",
                        distanceKm: driver.distanceKm,
                        etaMinutes: driver.etaMinutes,
                        expiresAt,
                    },
                    create: {
                        rideId: ride.id,
                        driverId: driver.id,
                        status: "PENDING",
                        distanceKm: driver.distanceKm,
                        etaMinutes: driver.etaMinutes,
                        expiresAt,
                    },
                }).catch((err) => console.error("Error upserting ride offer:", err));
            }

            // Prepare push notification payload
            const pushDetails: RidePushDetails = {
                rideId: ride.id,
                originAddress: ride.originAddress,
                destAddress: ride.destAddress,
                originLat,
                originLng,
                destLat: ride.destLat || 0,
                destLng: ride.destLng || 0,
                distanceKm: nearbyDrivers[0].distanceKm,
                etaMinutes: nearbyDrivers[0].etaMinutes,
                fare: ride.fare || 5.0,
                vehicleType: ride.vehicleType || undefined,
                rideCategory: ride.rideCategory,
                expiresAt: expiresAt.toISOString(),
            };

            // 1. Send High-Priority Background Push Notification (FCM / APNs via Expo)
            PushNotificationService.notifyDriversOfRideRequest(nearbyDrivers, pushDetails).catch(
                (err) => console.error("Push notification error in broadcast:", err)
            );

            // 2. Publish Real-Time Event via SSE for foregrounded drivers and dashboards
            for (const driver of nearbyDrivers) {
                rideStreamManager.publish({
                    type: "RIDE_OFFER_RECEIVED",
                    rideId: ride.id,
                    driverId: driver.id,
                    data: {
                        ride: {
                            ...ride,
                            distanceKm: driver.distanceKm,
                            etaMinutes: driver.etaMinutes,
                        },
                        offerExpiresAt: expiresAt.toISOString(),
                        countdownSeconds: DispatchEngine.OFFER_EXPIRATION_SECONDS,
                    },
                    timestamp: new Date().toISOString(),
                });
            }

            // Also broadcast general RIDE_REQUESTED event for Admin / Dispatcher dashboard
            rideStreamManager.publish({
                type: "RIDE_REQUESTED",
                rideId: ride.id,
                data: ride,
                timestamp: new Date().toISOString(),
            });

            return { offeredCount: nearbyDrivers.length, drivers: nearbyDrivers };
        } catch (error) {
            console.error("Error broadcasting ride offers:", error);
            return { offeredCount: 0, drivers: [] };
        }
    }

    /**
     * Atomically accept a ride offer. Prevents race conditions when multiple drivers tap Accept.
     */
    public static async acceptRideOffer(
        rideId: string,
        driverProfileId: string,
        driverPaymentPhone?: string
    ): Promise<{
        success: boolean;
        code?: "SUCCESS" | "ALREADY_TAKEN" | "NOT_FOUND" | "DRIVER_UNAVAILABLE";
        message: string;
        ride?: unknown;
    }> {
        try {
            // 1. Verify driver availability
            let driver = await prisma.driverProfile.findUnique({
                where: { id: driverProfileId },
                include: { user: { select: { name: true, phone: true } } },
            });

            if (!driver) {
                return {
                    success: false,
                    code: "NOT_FOUND",
                    message: "Driver profile not found.",
                };
            }

            if (driver.approvalStatus && driver.approvalStatus !== "APPROVED") {
                return {
                    success: false,
                    code: "DRIVER_UNAVAILABLE",
                    message: "Driver account is pending review or not approved.",
                };
            }

            // Verify wallet eligibility
            const { checkDriverEligibility } = await import("@/lib/walletService");
            const eligibility = await checkDriverEligibility(driverProfileId).catch(() => ({ eligible: true }));
            if (!eligibility.eligible) {
                return {
                    success: false,
                    code: "DRIVER_UNAVAILABLE",
                    message: "Insufficient wallet balance. Please fund your wallet to accept rides.",
                };
            }

            // Ensure driver is marked online in database when actively accepting
            if (!driver.isOnline) {
                driver = await prisma.driverProfile.update({
                    where: { id: driverProfileId },
                    data: { isOnline: true },
                    include: { user: { select: { name: true, phone: true } } },
                });
            }

            // 2. Check if driver is already on another active ride (excluding this ride)
            const existingActive = await prisma.ride.findFirst({
                where: {
                    driverId: driverProfileId,
                    id: { not: rideId },
                    status: { in: ["ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS"] },
                },
            });

            if (existingActive) {
                return {
                    success: false,
                    code: "DRIVER_UNAVAILABLE",
                    message: "You already have another active ride in progress.",
                };
            }

            // 3. Atomically assign ride: accepts REQUESTED (open pool) OR ASSIGNED (customer-selected this driver)
            const updateResult = await prisma.ride.updateMany({
                where: {
                    id: rideId,
                    OR: [
                        // Open pool: any eligible driver can claim it
                        { status: "REQUESTED", driverId: null },
                        { status: "REQUESTED", driverId: driverProfileId },
                        // Customer pre-selected this driver — only they may accept
                        { status: "ASSIGNED", driverId: driverProfileId },
                    ]
                },
                data: {
                    status: "ACCEPTED",
                    driverId: driverProfileId,
                    driverPaymentPhone: driverPaymentPhone || driver.user?.phone || undefined,
                },
            });

            if (updateResult.count === 0) {
                // Check if already assigned to this driver
                const alreadyAssigned = await prisma.ride.findFirst({
                    where: {
                        id: rideId,
                        driverId: driverProfileId,
                        status: { in: ["ASSIGNED", "ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS"] },
                    },
                    include: {
                        rider: { select: { id: true, name: true, phone: true, email: true } },
                        driver: {
                            include: {
                                user: { select: { id: true, name: true, phone: true, email: true } },
                            },
                        },
                    },
                });

                if (alreadyAssigned) {
                    return {
                        success: true,
                        code: "SUCCESS",
                        message: "Ride accepted successfully!",
                        ride: alreadyAssigned,
                    };
                }

                return {
                    success: false,
                    code: "ALREADY_TAKEN",
                    message: "This ride request was already accepted by another driver or cancelled.",
                };
            }

            // 4. Fetch the newly assigned ride with full details
            const updatedRide = await prisma.ride.findUnique({
                where: { id: rideId },
                include: {
                    rider: { select: { id: true, name: true, phone: true, email: true } },
                    driver: {
                        include: {
                            user: { select: { id: true, name: true, phone: true, email: true } },
                        },
                    },
                },
            });

            // 5. Update this driver's offer to ACCEPTED
            await prisma.rideOffer.updateMany({
                where: {
                    rideId,
                    driverId: driverProfileId,
                },
                data: {
                    status: "ACCEPTED",
                    respondedAt: new Date(),
                },
            });

            // 6. Find other drivers who had pending offers and mark them MISSED
            const otherOffers = await prisma.rideOffer.findMany({
                where: {
                    rideId,
                    driverId: { not: driverProfileId },
                    status: "PENDING",
                },
                include: {
                    driver: {
                        select: { id: true, pushToken: true, fcmToken: true },
                    },
                },
            });

            await prisma.rideOffer.updateMany({
                where: {
                    rideId,
                    driverId: { not: driverProfileId },
                    status: "PENDING",
                },
                data: {
                    status: "MISSED",
                    respondedAt: new Date(),
                },
            });

            // 7. Notify other drivers that the ride was taken (dismisses modal and cancels push alert)
            const otherDriverTokens = otherOffers
                .map((o) => o.driver.pushToken || o.driver.fcmToken)
                .filter((t): t is string => Boolean(t));

            PushNotificationService.notifyDriversOfRideTaken(otherDriverTokens, rideId).catch(
                () => {}
            );

            for (const offer of otherOffers) {
                rideStreamManager.publish({
                    type: "RIDE_TAKEN",
                    rideId,
                    driverId: offer.driver.id,
                    data: {
                        rideId,
                        message: "This ride was accepted by another driver.",
                    },
                    timestamp: new Date().toISOString(),
                });
            }

            // 8. Publish RIDE_ACCEPTED event for rider, driver, and admin
            rideStreamManager.publish({
                type: "RIDE_ACCEPTED",
                rideId,
                driverId: driverProfileId,
                data: updatedRide,
                timestamp: new Date().toISOString(),
            });

            // 9. Create Dispatcher Log
            try {
                await prisma.dispatcherLog.create({
                    data: {
                        action: "RIDE_ACCEPTED",
                        details: JSON.stringify({
                            rideId,
                            driverId: driverProfileId,
                            driverName: updatedRide?.driver?.user?.name,
                            clientName: updatedRide?.rider?.name || updatedRide?.guestName,
                            originAddress: updatedRide?.originAddress,
                            destAddress: updatedRide?.destAddress,
                        }),
                    },
                });
            } catch {}

            return {
                success: true,
                code: "SUCCESS",
                message: "Ride accepted successfully!",
                ride: updatedRide,
            };
        } catch (error) {
            console.error("Error accepting ride offer:", error);
            return {
                success: false,
                code: "NOT_FOUND",
                message: "An unexpected error occurred while accepting the ride.",
            };
        }
    }

    /**
     * Decline a ride offer (driver chooses not to take this trip)
     */
    public static async declineRideOffer(
        rideId: string,
        driverProfileId: string
    ): Promise<{ success: boolean; message?: string }> {
        try {
            await prisma.rideOffer.updateMany({
                where: {
                    rideId,
                    driverId: driverProfileId,
                },
                data: {
                    status: "DECLINED",
                    respondedAt: new Date(),
                },
            });

            // If ride was assigned specifically to this driver, release it back to the dispatch pool
            const ride = await prisma.ride.findUnique({
                where: { id: rideId },
                include: { driver: { include: { user: true } } }
            });

            if (ride && ride.driverId === driverProfileId && (ride.status === "ASSIGNED" || ride.status === "REQUESTED")) {
                const driverName = ride.driver?.user?.name || "Driver";
                const updatedRide = await prisma.ride.update({
                    where: { id: rideId },
                    data: {
                        driverId: null,
                        status: "REQUESTED",
                        notes: ride.notes 
                            ? `${ride.notes} · [Driver ${driverName} declined trip]` 
                            : `[Driver ${driverName} declined trip]`
                    },
                    include: {
                        rider: { select: { id: true, name: true, phone: true } },
                        stops: { orderBy: { sequence: "asc" } }
                    }
                });

                // Re-dispatch to other nearby eligible drivers
                DispatchEngine.autoDispatchRide(rideId).catch((err) =>
                    console.error("Auto redispatch after driver decline error:", err)
                );

                // Broadcast to Admin Dispatch and all online drivers
                rideStreamManager.publish({
                    type: "RIDE_REQUESTED",
                    rideId: updatedRide.id,
                    data: updatedRide,
                    timestamp: new Date().toISOString()
                });

                rideStreamManager.publish({
                    type: "RIDE_UPDATED",
                    rideId: updatedRide.id,
                    data: {
                        ...updatedRide,
                        driverReleased: true,
                        reason: "Driver declined offer",
                        message: `Driver declined. Trip #${updatedRide.bookingReference || rideId.slice(-6).toUpperCase()} returned to pool.`
                    },
                    timestamp: new Date().toISOString()
                });
            }

            return { success: true, message: "Ride offer declined." };
        } catch (error) {
            console.error("Error declining ride offer:", error);
            return { success: false };
        }
    }

    /**
     * Main dispatch trigger called when customer creates a new ride
     */
    public static async autoDispatchRide(rideId: string): Promise<boolean> {
        const result = await this.broadcastRideOffers(rideId);
        return result.offeredCount > 0;
    }
}
