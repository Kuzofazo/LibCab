import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";
import { DispatchEngine } from "@/services/dispatchEngine";
import { rideStreamManager } from "@/lib/sse";

// POST: Trigger dispatch for a specific scheduled ride (admin or system worker)
export async function POST(req: Request) {
    try {
        const user = await verifyJWT(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { rideId, driverId } = body;

        if (!rideId) {
            return NextResponse.json({ error: "rideId is required" }, { status: 400 });
        }

        const ride = await prisma.ride.findUnique({
            where: { id: rideId },
            include: {
                rider: { select: { id: true, name: true, phone: true } },
                stops: { orderBy: { sequence: "asc" } },
            }
        });

        if (!ride) {
            return NextResponse.json({ error: "Ride not found" }, { status: 404 });
        }

        if (driverId) {
            // Pre-assign directly to a specified driver
            const dp = await prisma.driverProfile.findFirst({
                where: { OR: [{ id: driverId }, { userId: driverId }] },
                include: { user: true }
            });

            if (!dp) {
                return NextResponse.json({ error: "Driver not found" }, { status: 404 });
            }

            const updatedRide = await prisma.ride.update({
                where: { id: rideId },
                data: {
                    status: "ACCEPTED",
                    scheduledStatus: "DISPATCHED",
                    driverId: dp.id,
                },
                include: {
                    driver: { include: { user: true } },
                    rider: { select: { id: true, name: true, phone: true } },
                    stops: { orderBy: { sequence: "asc" } }
                }
            });

            rideStreamManager.publish({
                type: "RIDE_ACCEPTED",
                rideId: updatedRide.id,
                driverId: dp.id,
                data: updatedRide,
                timestamp: new Date().toISOString(),
            });

            return NextResponse.json({ success: true, ride: updatedRide, message: `Ride assigned to ${dp.user.name}` });
        }

        // Automatic dispatch via DispatchEngine
        const updatedRide = await prisma.ride.update({
            where: { id: rideId },
            data: {
                status: "REQUESTED",
                scheduledStatus: "DISPATCHED",
            },
            include: {
                rider: { select: { id: true, name: true, phone: true } },
                stops: { orderBy: { sequence: "asc" } }
            }
        });

        // Trigger auto driver discovery
        DispatchEngine.autoDispatchRide(updatedRide.id).catch((err) =>
            console.error("Scheduled ride dispatch error:", err)
        );

        rideStreamManager.publish({
            type: "RIDE_REQUESTED",
            rideId: updatedRide.id,
            data: updatedRide,
            timestamp: new Date().toISOString(),
        });

        return NextResponse.json({ success: true, ride: updatedRide, message: "Ride dispatched to nearby drivers" });
    } catch (error: any) {
        console.error("Scheduled dispatch error:", error);
        return NextResponse.json({ error: error.message || "Failed to dispatch scheduled ride" }, { status: 500 });
    }
}

// GET: Check all scheduled rides approaching their pickup window (e.g. <= 25 mins) and auto-dispatch
export async function GET(req: Request) {
    try {
        const now = new Date();
        const dispatchHorizon = new Date(now.getTime() + 25 * 60 * 1000); // 25 mins ahead

        const dueScheduledRides = await prisma.ride.findMany({
            where: {
                isScheduled: true,
                status: "SCHEDULED",
                scheduledStatus: "CONFIRMED",
                scheduledFor: {
                    lte: dispatchHorizon,
                },
            },
            include: {
                rider: { select: { name: true, phone: true } }
            },
            take: 20
        });

        const results = [];

        for (const ride of dueScheduledRides) {
            try {
                await prisma.ride.update({
                    where: { id: ride.id },
                    data: {
                        status: "REQUESTED",
                        scheduledStatus: "DISPATCHED",
                    }
                });

                DispatchEngine.autoDispatchRide(ride.id).catch((err) =>
                    console.error("Worker dispatch error:", err)
                );

                rideStreamManager.publish({
                    type: "RIDE_REQUESTED",
                    rideId: ride.id,
                    data: ride,
                    timestamp: new Date().toISOString(),
                });

                results.push({ id: ride.id, bookingReference: ride.bookingReference, status: "DISPATCHED" });
            } catch (rErr) {
                console.error(`Failed to dispatch ride ${ride.id}:`, rErr);
            }
        }

        return NextResponse.json({ checkedAt: now.toISOString(), dispatchedCount: results.length, rides: results });
    } catch (error: any) {
        console.error("Scheduled dispatch worker error:", error);
        return NextResponse.json({ error: "Failed to run scheduled dispatch scan" }, { status: 500 });
    }
}
