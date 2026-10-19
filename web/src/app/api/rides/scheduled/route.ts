import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";
import crypto from "crypto";

export async function GET(req: Request) {
    try {
        const user = await verifyJWT(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status");
        const fromDate = searchParams.get("from");
        const toDate = searchParams.get("to");

        let whereClause: any = {
            isScheduled: true,
            isArchived: false,
        };

        // Riders only see their own scheduled rides; Admins see all
        if (user.role === "RIDER") {
            whereClause.riderId = user.userId;
        } else if (user.role === "DRIVER") {
            const dp = await prisma.driverProfile.findUnique({ where: { userId: user.userId } });
            whereClause.driverId = dp?.id || user.userId;
        }

        if (status && status !== "ALL") {
            whereClause.scheduledStatus = status;
        }

        if (fromDate || toDate) {
            whereClause.scheduledFor = {};
            if (fromDate) whereClause.scheduledFor.gte = new Date(fromDate);
            if (toDate) whereClause.scheduledFor.lte = new Date(toDate);
        }

        const scheduledRides = await prisma.ride.findMany({
            where: whereClause,
            include: {
                rider: { select: { id: true, name: true, phone: true, email: true } },
                driver: {
                    include: {
                        user: { select: { id: true, name: true, phone: true } }
                    }
                },
                stops: { orderBy: { sequence: "asc" } },
            },
            orderBy: { scheduledFor: "asc" },
            take: 100,
        });

        return NextResponse.json(scheduledRides);
    } catch (error) {
        console.error("GET scheduled rides error:", error);
        return NextResponse.json({ error: "Failed to fetch scheduled rides" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await verifyJWT(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const {
            originAddress,
            destAddress,
            originLat,
            originLng,
            destLat,
            destLng,
            vehicleType,
            rideCategory,
            paymentMethod,
            customerPaymentPhone,
            fare,
            scheduledFor,
            notes,
            stops,
            promoCode,
            discountAmount,
        } = body;

        if (!originAddress || !destAddress || !scheduledFor) {
            return NextResponse.json({ error: "Pickup, destination, and scheduled time are required." }, { status: 400 });
        }

        const scheduledDate = new Date(scheduledFor);
        if (isNaN(scheduledDate.getTime())) {
            return NextResponse.json({ error: "Invalid scheduled date/time format." }, { status: 400 });
        }

        // Must be in the future (at least 15 minutes ahead)
        const minTime = Date.now() + 15 * 60 * 1000;
        if (scheduledDate.getTime() < minTime) {
            return NextResponse.json({ error: "Scheduled rides must be booked at least 15 minutes in advance." }, { status: 400 });
        }

        // Generate unique booking reference e.g. AC-SCH-K89J2-401
        const randomRef = crypto.randomBytes(3).toString("hex").toUpperCase();
        const bookingReference = `AC-SCH-${randomRef}`;

        // Create the scheduled ride
        const newScheduledRide = await prisma.ride.create({
            data: {
                riderId: user.userId,
                originAddress,
                destAddress,
                originLat: originLat || 6.3156,
                originLng: originLng || -10.8074,
                destLat: destLat || 6.3000,
                destLng: destLng || -10.7900,
                vehicleType: vehicleType || "Car",
                rideCategory: rideCategory || "Regular",
                paymentMethod: paymentMethod || "MOMO",
                customerPaymentPhone: customerPaymentPhone || undefined,
                fare: fare !== undefined ? parseFloat(fare) : undefined,
                status: "SCHEDULED",
                isScheduled: true,
                scheduledFor: scheduledDate,
                scheduledStatus: "CONFIRMED",
                bookingReference,
                notes: notes || undefined,
                promoCode: promoCode || undefined,
                discountAmount: discountAmount ? parseFloat(discountAmount) : 0,
                stops: stops && Array.isArray(stops) && stops.length > 0 ? {
                    create: stops.map((s: any, idx: number) => ({
                        sequence: idx + 1,
                        address: s.address,
                        lat: s.lat || 0,
                        lng: s.lng || 0,
                        status: "PENDING",
                    }))
                } : undefined,
            },
            include: {
                rider: { select: { id: true, name: true, phone: true } },
                stops: { orderBy: { sequence: "asc" } }
            }
        });

        // Create Dispatcher Log for Admin visibility
        try {
            await prisma.dispatcherLog.create({
                data: {
                    dispatcherId: user.userId,
                    action: "SCHEDULED_RIDE_BOOKED",
                    details: JSON.stringify({
                        rideId: newScheduledRide.id,
                        bookingReference: newScheduledRide.bookingReference,
                        scheduledFor: newScheduledRide.scheduledFor,
                        originAddress: newScheduledRide.originAddress,
                        destAddress: newScheduledRide.destAddress,
                        rideCategory: newScheduledRide.rideCategory,
                        fare: newScheduledRide.fare,
                    })
                }
            });
        } catch (logErr) {
            console.warn("Failed to create dispatcher log for scheduled ride:", logErr);
        }

        return NextResponse.json(newScheduledRide, { status: 201 });
    } catch (error: any) {
        console.error("Scheduled ride creation error:", error);
        return NextResponse.json({ error: error.message || "Failed to schedule ride" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const user = await verifyJWT(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { id, action, scheduledFor, notes } = body;

        if (!id) {
            return NextResponse.json({ error: "Ride ID is required" }, { status: 400 });
        }

        const ride = await prisma.ride.findUnique({
            where: { id },
            select: { id: true, riderId: true, isScheduled: true, scheduledStatus: true, status: true, scheduledFor: true }
        });

        if (!ride || !ride.isScheduled) {
            return NextResponse.json({ error: "Scheduled ride not found" }, { status: 404 });
        }

        // Authorize: Rider can only modify their own ride; Admins can modify any
        if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && ride.riderId !== user.userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (action === "CANCEL") {
            const updated = await prisma.ride.update({
                where: { id },
                data: {
                    status: "CANCELLED",
                    scheduledStatus: "CANCELLED",
                }
            });
            return NextResponse.json({ message: "Scheduled ride cancelled successfully", ride: updated });
        }

        // Modify date/time or notes
        const updateData: any = {};
        if (scheduledFor) {
            const newDate = new Date(scheduledFor);
            if (isNaN(newDate.getTime()) || newDate.getTime() < Date.now() + 15 * 60 * 1000) {
                return NextResponse.json({ error: "Invalid scheduled time. Must be at least 15 minutes in advance." }, { status: 400 });
            }
            updateData.scheduledFor = newDate;
        }
        if (notes !== undefined) updateData.notes = notes;

        const updated = await prisma.ride.update({
            where: { id },
            data: updateData,
            include: {
                stops: { orderBy: { sequence: "asc" } },
                driver: { include: { user: true } }
            }
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error("Scheduled ride update error:", error);
        return NextResponse.json({ error: error.message || "Failed to update scheduled ride" }, { status: 500 });
    }
}
