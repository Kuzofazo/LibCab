import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";
import { memoryCache } from "@/lib/cache";
import { rideStreamManager } from "@/lib/sse";
import { DispatchEngine } from "@/services/dispatchEngine";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await verifyJWT(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: "Ride ID is required" }, { status: 400 });
        }

        const body = await req.json().catch(() => ({}));
        const { reason = "", returnToPool = false, cancelledBy: requestedCancelledBy } = body;

        const ride = await prisma.ride.findUnique({
            where: { id },
            include: {
                rider: { select: { id: true, name: true, phone: true, email: true } },
                driver: {
                    include: {
                        user: { select: { id: true, name: true, phone: true, email: true } }
                    }
                }
            }
        });

        if (!ride) {
            return NextResponse.json({ error: "Ride not found" }, { status: 404 });
        }

        if (ride.status === "COMPLETED") {
            return NextResponse.json({ error: "Cannot cancel a ride that has already been completed." }, { status: 400 });
        }

        if (ride.status === "CANCELLED") {
            return NextResponse.json({ error: "This ride is already cancelled.", ride }, { status: 200 });
        }

        const callerRole = user.role;
        const callerUserId = user.userId;

        // Invalidate in-memory cache
        memoryCache.delete(`ride_details_${id}`);

        // ─────────────────────────────────────────────────────────────────────
        // CASE 1: DRIVER CANCELLATION
        // ─────────────────────────────────────────────────────────────────────
        if (callerRole === "DRIVER") {
            let driverProfile = await prisma.driverProfile.findUnique({
                where: { userId: callerUserId },
                include: { user: { select: { name: true, phone: true } } }
            });

            if (!driverProfile) {
                driverProfile = await prisma.driverProfile.findUnique({
                    where: { id: callerUserId },
                    include: { user: { select: { name: true, phone: true } } }
                });
            }

            const driverProfileId = driverProfile?.id;
            const driverName = driverProfile?.user?.name || "Driver";

            // If returnToPool is true (or default for driver cancel):
            // Reset the trip back to REQUESTED with driverId: null so another driver can take it!
            if (returnToPool !== false) {
                // If deposit was already deducted, refund it
                if (ride.depositDeducted && ride.driverId) {
                    try {
                        const { refundRideDeposit } = await import("@/lib/walletService");
                        await refundRideDeposit(id, `Refund: Driver released trip (${reason || "No reason given"})`);
                    } catch (refErr) {
                        console.error("Failed to refund deposit on driver release:", refErr);
                    }
                }

                // Update ride: reset driverId to null, status back to REQUESTED
                const updatedRide = await prisma.ride.update({
                    where: { id },
                    data: {
                        driverId: null,
                        status: "REQUESTED",
                        startedAt: null,
                        depositDeducted: false,
                        depositAmount: null,
                        notes: ride.notes
                            ? `${ride.notes} · [Driver ${driverName} released trip: ${reason || "No reason given"}]`
                            : `[Driver ${driverName} released trip: ${reason || "No reason given"}]`,
                    },
                    include: {
                        rider: { select: { id: true, name: true, phone: true, email: true } },
                        driver: {
                            include: {
                                user: { select: { id: true, name: true, phone: true, email: true } }
                            }
                        }
                    }
                });

                // Mark this driver's offer as DECLINED so they aren't immediately offered it again
                if (driverProfileId) {
                    await prisma.rideOffer.updateMany({
                        where: { rideId: id, driverId: driverProfileId },
                        data: { status: "DECLINED", respondedAt: new Date() }
                    }).catch(() => {});
                }

                // Create audit log
                try {
                    await prisma.dispatcherLog.create({
                        data: {
                            dispatcherId: callerUserId,
                            action: "DRIVER_CANCELLED_RETURNED_TO_POOL",
                            details: JSON.stringify({
                                rideId: id,
                                bookingReference: ride.bookingReference,
                                driverId: driverProfileId,
                                driverName,
                                reason: reason || "Driver released trip",
                                clientName: ride.rider?.name || ride.guestName,
                                pickup: ride.originAddress,
                                destination: ride.destAddress,
                            })
                        }
                    });
                } catch {}

                // Broadcast SSE:
                // 1. Tell this specific driver: ride is cancelled/cleared from their queue
                rideStreamManager.publish({
                    type: "RIDE_CANCELLED",
                    rideId: id,
                    driverId: driverProfileId,
                    data: {
                        ...updatedRide,
                        cancelledBy: "DRIVER",
                        driverReleased: true,
                        reason: reason || "Driver released trip",
                        message: "Trip cancelled and returned to dispatch queue."
                    },
                    timestamp: new Date().toISOString()
                });

                // 2. Tell the customer: searching for another driver
                rideStreamManager.publish({
                    type: "RIDE_UPDATED",
                    rideId: id,
                    data: {
                        ...updatedRide,
                        status: "REQUESTED",
                        driver: null,
                        driverId: null,
                        message: "Your driver had to cancel. Re-matching you with another nearby driver..."
                    },
                    timestamp: new Date().toISOString()
                });

                // 3. Re-dispatch to other nearby online drivers & notify Dispatch dashboard
                rideStreamManager.publish({
                    type: "RIDE_REQUESTED",
                    rideId: id,
                    data: updatedRide,
                    timestamp: new Date().toISOString()
                });

                DispatchEngine.autoDispatchRide(id).catch((err) =>
                    console.error("Auto-redispatch error after driver release:", err)
                );

                return NextResponse.json({
                    success: true,
                    action: "RETURNED_TO_POOL",
                    message: "Trip cancelled and returned to dispatch pool for reassignment.",
                    ride: updatedRide
                });
            } else {
                // Driver requested terminal cancellation (e.g. Passenger No-Show / Fraud)
                if (ride.depositDeducted && ride.driverId) {
                    try {
                        const { refundRideDeposit } = await import("@/lib/walletService");
                        await refundRideDeposit(id, `Refund: Driver cancelled trip (${reason || "Terminal cancellation"})`);
                    } catch (refErr) {
                        console.error("Failed to refund deposit on driver cancel:", refErr);
                    }
                }

                const updatedRide = await prisma.ride.update({
                    where: { id },
                    data: {
                        status: "CANCELLED",
                        notes: ride.notes
                            ? `${ride.notes} · [Driver ${driverName} cancelled trip: ${reason || "Terminal"}]`
                            : `[Driver ${driverName} cancelled trip: ${reason || "Terminal"}]`,
                    },
                    include: {
                        rider: { select: { id: true, name: true, phone: true, email: true } },
                        driver: {
                            include: {
                                user: { select: { id: true, name: true, phone: true, email: true } }
                            }
                        }
                    }
                });

                await prisma.rideOffer.updateMany({
                    where: { rideId: id, status: "PENDING" },
                    data: { status: "EXPIRED", respondedAt: new Date() }
                }).catch(() => {});

                try {
                    await prisma.dispatcherLog.create({
                        data: {
                            dispatcherId: callerUserId,
                            action: "DRIVER_CANCELLED",
                            details: JSON.stringify({
                                rideId: id,
                                bookingReference: ride.bookingReference,
                                driverId: driverProfileId,
                                driverName,
                                reason: reason || "Driver terminated trip",
                                clientName: ride.rider?.name || ride.guestName,
                            })
                        }
                    });
                } catch {}

                rideStreamManager.publish({
                    type: "RIDE_CANCELLED",
                    rideId: id,
                    driverId: driverProfileId,
                    data: {
                        ...updatedRide,
                        cancelledBy: "DRIVER",
                        reason: reason || "Driver cancelled trip"
                    },
                    timestamp: new Date().toISOString()
                });

                return NextResponse.json({
                    success: true,
                    action: "CANCELLED",
                    message: "Trip has been cancelled.",
                    ride: updatedRide
                });
            }
        }

        // ─────────────────────────────────────────────────────────────────────
        // CASE 2: CUSTOMER / RIDER CANCELLATION
        // ─────────────────────────────────────────────────────────────────────
        const previousDriverId = ride.driverId;
        const previousDriverUserId = ride.driver?.userId;

        // Refund driver deposit if it was deducted
        if (ride.depositDeducted && previousDriverId) {
            try {
                const { refundRideDeposit } = await import("@/lib/walletService");
                await refundRideDeposit(id, `Refund: Customer cancelled trip (${reason || "Customer cancelled"})`);
            } catch (refundErr) {
                console.error("Refund on customer cancellation error:", refundErr);
            }
        }

        const customerName = ride.rider?.name || ride.guestName || "Customer";

        const updatedRide = await prisma.ride.update({
            where: { id },
            data: {
                status: "CANCELLED",
                notes: ride.notes
                    ? `${ride.notes} · [Customer cancelled: ${reason || "No reason given"}]`
                    : `[Customer cancelled: ${reason || "No reason given"}]`,
            },
            include: {
                rider: { select: { id: true, name: true, phone: true, email: true } },
                driver: {
                    include: {
                        user: { select: { id: true, name: true, phone: true, email: true } }
                    }
                }
            }
        });

        // Expire all pending offers
        await prisma.rideOffer.updateMany({
            where: { rideId: id, status: "PENDING" },
            data: { status: "EXPIRED", respondedAt: new Date() }
        }).catch(() => {});

        // Create audit log
        try {
            await prisma.dispatcherLog.create({
                data: {
                    dispatcherId: callerUserId,
                    action: "CUSTOMER_CANCELLED",
                    details: JSON.stringify({
                        rideId: id,
                        bookingReference: ride.bookingReference,
                        clientName: customerName,
                        reason: reason || "Customer cancelled",
                        assignedDriverId: previousDriverId,
                        assignedDriverName: ride.driver?.user?.name,
                    })
                }
            });
        } catch {}

        // Broadcast RIDE_CANCELLED to:
        // 1. General stream (All dashboards, Dispatch, Available trips queue)
        // 2. Targeted driver channel (so the assigned driver receives high priority alert)
        rideStreamManager.publish({
            type: "RIDE_CANCELLED",
            rideId: id,
            driverId: previousDriverId || undefined,
            data: {
                ...updatedRide,
                cancelledBy: "RIDER",
                reason: reason || "Cancelled by customer",
                message: `Passenger ${customerName} has cancelled ride #${ride.bookingReference || id.slice(-6).toUpperCase()}.`
            },
            timestamp: new Date().toISOString()
        });

        return NextResponse.json({
            success: true,
            action: "CANCELLED",
            message: "Ride cancelled successfully.",
            ride: updatedRide
        });

    } catch (error: any) {
        console.error("Cancellation API error:", error);
        return NextResponse.json({
            error: "Failed to process cancellation",
            details: error.message || String(error)
        }, { status: 500 });
    }
}
