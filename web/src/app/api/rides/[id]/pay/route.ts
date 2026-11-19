import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";
import { rideStreamManager } from "@/lib/sse";
import { memoryCache } from "@/lib/cache";
import crypto from "crypto";

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
        const {
            paymentMethod = "MOMO",
            paymentPhone,
            amount,
            isCancellation = false,
        } = body;

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

        const effectiveFare = isCancellation 
            ? (ride.cancellationFare ?? ride.fare ?? 15.0) 
            : (amount !== undefined ? Number(amount) : (ride.fare ?? 25.0));

        const targetStatus = isCancellation ? "CANCELLED" : "COMPLETED";

        // Create PaymentTransaction
        const txnRef = `TXN-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
        const providerName = 
            paymentMethod === "ORANGE" ? "ORANGE" :
            paymentMethod === "CASH" ? "CASH" :
            paymentMethod === "CARD" ? "CARD" : "MTN";

        let transaction = null;
        try {
            transaction = await prisma.paymentTransaction.create({
                data: {
                    rideId: ride.id,
                    amount: effectiveFare,
                    currency: "USD",
                    provider: providerName,
                    status: "SUCCESS",
                    externalId: txnRef,
                }
            });
        } catch (txnErr) {
            console.warn("Could not create PaymentTransaction record:", txnErr);
        }

        // Update Ride
        const updatedRide = await prisma.ride.update({
            where: { id: rideId },
            data: {
                status: targetStatus,
                paymentStatus: "PAID",
                paymentMethod: paymentMethod,
                customerPaymentPhone: paymentPhone || ride.customerPaymentPhone || ride.rider?.phone || undefined,
                completedAt: !isCancellation ? (ride.completedAt || new Date()) : ride.completedAt,
                paymentConfirmedAt: new Date(),
                paymentAwaitingPassenger: false,
                cancelledAfterStart: isCancellation ? true : ride.cancelledAfterStart,
                cancellationFare: isCancellation ? effectiveFare : ride.cancellationFare,
            },
            include: {
                rider: { select: { id: true, name: true, phone: true, email: true } },
                driver: {
                    include: {
                        user: { select: { id: true, name: true, phone: true, email: true } }
                    }
                },
                stops: { orderBy: { sequence: "asc" } },
                payments: true
            }
        });

        // Invalidate cache
        try {
            memoryCache.delete(`ride_details_${rideId}`);
        } catch {}

        // Broadcast PAYMENT_CONFIRMED to both Passenger and Driver dashboards
        const confirmationPayload = {
            rideId: updatedRide.id,
            bookingReference: updatedRide.bookingReference,
            fare: effectiveFare,
            paymentMethod,
            paymentPhone,
            paymentStatus: "PAID",
            isCancellation,
            transactionId: transaction?.id || txnRef,
            completedAt: updatedRide.completedAt?.toISOString() || new Date().toISOString(),
            ride: updatedRide,
            message: isCancellation
                ? "Cancellation payment confirmed. Trip terminated."
                : "Payment confirmed successfully! Ride completed."
        };

        rideStreamManager.publish({
            type: "PAYMENT_CONFIRMED",
            rideId: updatedRide.id,
            driverId: updatedRide.driverId || undefined,
            data: confirmationPayload,
            timestamp: new Date().toISOString()
        });

        if (targetStatus === "COMPLETED") {
            rideStreamManager.publish({
                type: "RIDE_COMPLETED",
                rideId: updatedRide.id,
                driverId: updatedRide.driverId || undefined,
                data: updatedRide,
                timestamp: new Date().toISOString()
            });
        } else {
            rideStreamManager.publish({
                type: "RIDE_CANCELLED",
                rideId: updatedRide.id,
                driverId: updatedRide.driverId || undefined,
                data: {
                    ...updatedRide,
                    cancelledBy: "RIDER",
                    reason: "Cancelled after start with payment settled.",
                },
                timestamp: new Date().toISOString()
            });
        }

        // Also broadcast RIDE_UPDATED
        rideStreamManager.publish({
            type: "RIDE_UPDATED",
            rideId: updatedRide.id,
            driverId: updatedRide.driverId || undefined,
            data: updatedRide,
            timestamp: new Date().toISOString()
        });

        // Audit log
        try {
            await prisma.dispatcherLog.create({
                data: {
                    dispatcherId: user.userId,
                    action: isCancellation ? "RIDE_CANCELLED_AFTER_START_PAID" : "RIDE_PAYMENT_CONFIRMED",
                    details: JSON.stringify({
                        rideId: updatedRide.id,
                        bookingReference: updatedRide.bookingReference,
                        amount: effectiveFare,
                        paymentMethod,
                        isCancellation,
                        transactionRef: txnRef
                    })
                }
            });
        } catch {}

        return NextResponse.json({
            success: true,
            message: "Payment processed successfully",
            ride: updatedRide,
            transaction
        });

    } catch (error: any) {
        console.error("Payment confirmation API error:", error);
        return NextResponse.json({
            error: "Failed to confirm payment",
            details: error.message || String(error)
        }, { status: 500 });
    }
}
