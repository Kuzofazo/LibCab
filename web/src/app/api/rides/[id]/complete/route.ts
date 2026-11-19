import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";
import { rideStreamManager } from "@/lib/sse";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await verifyJWT(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: rideId } = await params;
        if (!rideId) {
            return NextResponse.json({ error: "Ride ID is required" }, { status: 400 });
        }

        const body = await req.json().catch(() => ({}));
        const { actualDistanceTravelled } = body;

        const ride = await prisma.ride.findUnique({
            where: { id: rideId },
            include: {
                rider: { select: { id: true, name: true, phone: true, email: true } },
                driver: {
                    include: {
                        user: { select: { id: true, name: true, phone: true, email: true } }
                    }
                },
                stops: { orderBy: { sequence: "asc" } }
            }
        });

        if (!ride) {
            return NextResponse.json({ error: "Ride not found" }, { status: 404 });
        }

        if (ride.status === "COMPLETED") {
            return NextResponse.json({ error: "Ride is already completed", ride }, { status: 200 });
        }

        if (ride.status === "CANCELLED") {
            return NextResponse.json({ error: "Cannot complete a cancelled ride." }, { status: 400 });
        }

        // Set payment awaiting passenger
        const updatedRide = await prisma.ride.update({
            where: { id: rideId },
            data: {
                paymentAwaitingPassenger: true,
                actualDistanceTravelled: actualDistanceTravelled !== undefined ? Number(actualDistanceTravelled) : undefined,
            },
            include: {
                rider: { select: { id: true, name: true, phone: true, email: true } },
                driver: {
                    include: {
                        user: { select: { id: true, name: true, phone: true, email: true } }
                    }
                },
                stops: { orderBy: { sequence: "asc" } }
            }
        });

        // Broadcast PAYMENT_REQUESTED to passenger and driver
        const paymentPayload = {
            rideId: updatedRide.id,
            bookingReference: updatedRide.bookingReference,
            fare: updatedRide.fare || 25.0,
            originalFare: updatedRide.originalFare,
            discountAmount: updatedRide.discountAmount,
            originAddress: updatedRide.originAddress,
            destAddress: updatedRide.destAddress,
            riderId: updatedRide.riderId,
            driverId: updatedRide.driverId,
            driverName: updatedRide.driver?.user?.name || "Driver",
            driverPhone: updatedRide.driver?.user?.phone,
            licensePlate: updatedRide.driver?.licensePlate,
            paymentMethod: updatedRide.paymentMethod || "MOMO",
            paymentAwaitingPassenger: true,
            cancellationType: null,
            message: "Trip ended by driver. Please select payment method to complete ride."
        };

        rideStreamManager.publish({
            type: "PAYMENT_REQUESTED",
            rideId: updatedRide.id,
            driverId: updatedRide.driverId || undefined,
            data: paymentPayload,
            timestamp: new Date().toISOString()
        });

        // Also broadcast RIDE_UPDATED
        rideStreamManager.publish({
            type: "RIDE_UPDATED",
            rideId: updatedRide.id,
            driverId: updatedRide.driverId || undefined,
            data: updatedRide,
            timestamp: new Date().toISOString()
        });

        // Create log
        try {
            await prisma.dispatcherLog.create({
                data: {
                    dispatcherId: user.userId,
                    action: "RIDE_END_REQUESTED_AWAITING_PAYMENT",
                    details: JSON.stringify({
                        rideId: updatedRide.id,
                        bookingReference: updatedRide.bookingReference,
                        fare: updatedRide.fare,
                        driverId: updatedRide.driverId,
                        clientName: updatedRide.rider?.name || updatedRide.guestName
                    })
                }
            });
        } catch {}

        return NextResponse.json({
            success: true,
            awaitingPayment: true,
            fare: updatedRide.fare,
            ride: updatedRide
        });
    } catch (error: any) {
        console.error("Complete ride API error:", error);
        return NextResponse.json({
            error: "Failed to initiate ride completion",
            details: error.message || String(error)
        }, { status: 500 });
    }
}
