import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { rideStreamManager } from "@/lib/sse";
import { DispatchEngine } from "@/services/dispatchEngine";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            sessionId,
            pickup,
            destination,
            payment,
            guestName,
            rideCategory,
            driverId,
            vehicleType,
            fare,
            originLat,
            originLng,
            destLat,
            destLng,
            phone
        } = body;

        if (!pickup || !destination) {
            return NextResponse.json({ error: "Missing required fields: pickup and destination are required" }, { status: 400 });
        }

        // 1. Resolve or Create Session
        let guestPhone = phone || "0880000000";
        let activeSessionId = sessionId;

        if (sessionId && sessionId !== "GUEST-SESSION") {
            try {
                const existingSession = await prisma.guestSession.findUnique({
                    where: { id: sessionId }
                });
                if (existingSession && existingSession.isActive) {
                    guestPhone = existingSession.phone;
                }
            } catch (err) {
                console.warn("Session lookup skipped:", err);
            }
        }

        // Ensure a valid guestSession exists in database so subsequent lookups succeed
        try {
            const upsertedSession = await prisma.guestSession.upsert({
                where: { phone: guestPhone },
                update: { isActive: true },
                create: { phone: guestPhone, isActive: true }
            });
            activeSessionId = upsertedSession.id;
        } catch (sessErr) {
            console.warn("Guest session upsert warning:", sessErr);
        }

        // 2. Find or create placeholder guest user
        let guestUser = await prisma.user.findUnique({ where: { email: "guest@africab.com" } });
        if (!guestUser) {
            const hashedPlaceholder = await bcrypt.hash("guest_placeholder_" + Math.random(), 10);
            guestUser = await prisma.user.create({
                data: {
                    email: "guest@africab.com",
                    name: "Guest User",
                    password: hashedPlaceholder,
                    role: "RIDER",
                    phone: guestPhone
                }
            });
        }
        const guestUserId = guestUser.id;

        // 3. Safely resolve selected driver to prevent Foreign Key constraint errors with mock/sample drivers
        let resolvedDriverProfileId: string | null = null;
        let initialStatus = "REQUESTED";

        if (driverId) {
            const driverProfile = await prisma.driverProfile.findFirst({
                where: {
                    OR: [
                        { id: driverId },
                        { userId: driverId }
                    ]
                }
            });
            if (driverProfile) {
                resolvedDriverProfileId = driverProfile.id;
                initialStatus = "ACCEPTED";
            }
        }

        // 4. Create Ride
        const ride = await prisma.ride.create({
            data: {
                riderId: guestUserId,
                driverId: resolvedDriverProfileId,
                guestPhone,
                guestName: guestName || "Guest Customer",
                originAddress: pickup,
                destAddress: destination,
                vehicleType: vehicleType || "Car",
                rideCategory: rideCategory || "Regular",
                paymentMethod: payment || "MOMO",
                status: initialStatus,
                fare: fare !== undefined && fare !== null ? parseFloat(String(fare)) : null,
                originLat: originLat !== undefined && originLat !== null ? parseFloat(String(originLat)) : 6.3156,
                originLng: originLng !== undefined && originLng !== null ? parseFloat(String(originLng)) : -10.8074,
                destLat: destLat !== undefined && destLat !== null ? parseFloat(String(destLat)) : 6.3156,
                destLng: destLng !== undefined && destLng !== null ? parseFloat(String(destLng)) : -10.8074,
            },
            include: {
                driver: {
                    include: {
                        user: { select: { name: true, phone: true } }
                    }
                }
            }
        });

        // 5. Broadcast to live SSE stream for real-time dispatchers & admins
        try {
            rideStreamManager.publish({
                type: initialStatus === "ACCEPTED" ? "RIDE_ACCEPTED" : "RIDE_REQUESTED",
                rideId: ride.id,
                driverId: resolvedDriverProfileId || undefined,
                data: ride,
                timestamp: new Date().toISOString()
            });
        } catch (streamErr) {
            console.error("SSE stream broadcast error:", streamErr);
        }

        // 6. Trigger automatic driver dispatch engine if no driver directly selected
        if (!resolvedDriverProfileId) {
            DispatchEngine.autoDispatchRide(ride.id).catch((err) =>
                console.error("Guest ride auto-dispatch error:", err)
            );
        }

        return NextResponse.json({ ...ride, sessionId: activeSessionId });

    } catch (error: any) {
        console.error("Create Guest Ride Error:", error);
        return NextResponse.json({
            error: "Failed to create ride",
            details: error.message || String(error),
            meta: (error as any).meta,
            code: (error as any).code
        }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const { rideId, sessionId, status } = body;

        if (!rideId || !status) {
            return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
        }

        // Only allow CONFIRMED or CANCELLED status changes for this vector
        if (status !== "CONFIRMED" && status !== "CANCELLED") {
            return NextResponse.json({ error: "Invalid status command for client" }, { status: 400 });
        }

        const validRide = await prisma.ride.findUnique({
            where: { id: rideId }
        });

        if (!validRide) {
            return NextResponse.json({ error: "Ride not found" }, { status: 404 });
        }

        const updatedRide = await prisma.ride.update({
            where: { id: rideId },
            data: { status }
        });

        try {
            rideStreamManager.publish({
                type: "RIDE_UPDATED",
                rideId: updatedRide.id,
                driverId: updatedRide.driverId || undefined,
                data: updatedRide,
                timestamp: new Date().toISOString()
            });
        } catch {}

        if (status === "CONFIRMED") {
            try {
                await prisma.dispatcherLog.create({
                    data: {
                        action: "CUSTOMER_CONFIRMED",
                        details: JSON.stringify({ rideId, guestName: validRide.guestName })
                    }
                });
            } catch {}
        }
        if (status === "CANCELLED") {
            try {
                await prisma.dispatcherLog.create({
                    data: {
                        action: "CUSTOMER_CANCELLED",
                        details: JSON.stringify({ rideId, guestName: validRide.guestName })
                    }
                });
            } catch {}
        }

        return NextResponse.json(updatedRide);

    } catch (error: any) {
        return NextResponse.json({ error: "Failed to patch state", details: error.message }, { status: 500 });
    }
}
