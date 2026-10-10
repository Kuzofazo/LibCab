import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { idempotencyStore } from "@/lib/idempotency";
import { rideStreamManager } from "@/lib/sse";
import { DispatchEngine } from "@/services/dispatchEngine";

export async function GET() {
    try {
        const user = await verifyJWT();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const rides = await prisma.ride.findMany({
            where: { isArchived: false },
            include: {
                rider: { select: { id: true, name: true, email: true, phone: true } },
                driver: {
                    include: {
                        user: { select: { id: true, name: true, phone: true, email: true } }
                    }
                },
            },
            orderBy: { createdAt: "desc" },
            take: 100
        });
        return NextResponse.json(rides);
    } catch (error) {
        console.error("GET rides error:", error);
        return NextResponse.json({ error: "Failed to fetch rides" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await verifyJWT();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Idempotency Protection Check
        const idempotencyKey = req.headers.get("x-idempotency-key") || req.headers.get("idempotency-key");
        if (idempotencyKey) {
            const cached = idempotencyStore.get(idempotencyKey);
            if (cached) {
                return NextResponse.json(cached.body, { status: cached.status });
            }
        }

        const body = await req.json();
        const {
            riderId,
            guestPhone,
            guestName,
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
            driverPaymentPhone,
            driverId, // Optional directly selected driver from discovery
            fare
        } = body;

        if ((!riderId && !guestPhone) || !originAddress || !destAddress) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        let finalRiderId = riderId;

        if (!finalRiderId) {
            let guestUser = await prisma.user.findUnique({ where: { email: "guest@africab.com" } });
            if (!guestUser) {
                const hashedPlaceholder = await bcrypt.hash("guest_placeholder_" + Math.random(), 10);
                guestUser = await prisma.user.create({
                    data: {
                        email: "guest@africab.com",
                        name: "Guest User",
                        password: hashedPlaceholder,
                        role: "RIDER",
                        phone: "0000000000"
                    }
                });
            }
            finalRiderId = guestUser.id;
        }

        // Resolve selected driver if provided
        let resolvedDriverProfileId: string | undefined = undefined;
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

        const newRide = await prisma.ride.create({
            data: {
                riderId: finalRiderId,
                guestPhone: guestPhone || undefined,
                guestName: guestName || undefined,
                driverId: resolvedDriverProfileId,
                originAddress: originAddress,
                destAddress,
                originLat: originLat || 0,
                originLng: originLng || 0,
                destLat: destLat || 0,
                destLng: destLng || 0,
                vehicleType: vehicleType || "Car",
                rideCategory: rideCategory || "Regular",
                paymentMethod: paymentMethod || "MOMO",
                customerPaymentPhone: customerPaymentPhone || guestPhone || undefined,
                driverPaymentPhone: driverPaymentPhone || undefined,
                fare: fare !== undefined ? parseFloat(fare) : undefined,
                status: initialStatus,
                paymentStatus: "PENDING",
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

        // Create Dispatcher Log for Admin Notification
        try {
            await prisma.dispatcherLog.create({
                data: {
                    dispatcherId: user.userId,
                    action: initialStatus === "ACCEPTED" ? "RIDE_DIRECT_MATCHED" : "RIDE_REQUESTED",
                    details: JSON.stringify({
                        rideId: newRide.id,
                        clientName: newRide.guestName || newRide.rider?.name || "Client",
                        guestPhone: newRide.guestPhone,
                        originAddress: newRide.originAddress,
                        destAddress: newRide.destAddress,
                        vehicleType: newRide.vehicleType,
                        rideCategory: newRide.rideCategory,
                        paymentMethod: newRide.paymentMethod,
                        driverId: resolvedDriverProfileId,
                        driverName: newRide.driver?.user?.name,
                    })
                }
            });
        } catch (logErr) {
            console.error("Failed to log ride request notification:", logErr);
        }

        // Trigger asynchronous automated driver matching engine if no driver directly selected
        if (!resolvedDriverProfileId) {
            DispatchEngine.autoDispatchRide(newRide.id).catch((err) =>
                console.error("Auto dispatch background task error:", err)
            );
        }

        // Publish SSE Event for Admin, Riders, and Drivers
        const eventType = initialStatus === "ACCEPTED" ? "RIDE_ACCEPTED" : "RIDE_REQUESTED";
        rideStreamManager.publish({
            type: eventType,
            rideId: newRide.id,
            driverId: resolvedDriverProfileId,
            data: newRide,
            timestamp: new Date().toISOString(),
        });

        // Save response in idempotency cache if key supplied
        if (idempotencyKey) {
            idempotencyStore.set(idempotencyKey, 200, newRide);
        }

        return NextResponse.json(newRide);

    } catch (error: unknown) {
        console.error("Ride creation error:", error);
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: "Failed to create ride", details: message }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const user = await verifyJWT();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { id, status, driverId, paymentStatus, paymentMethod, customerPaymentPhone, driverPaymentPhone, fare } = body;

        if (!id) {
            return NextResponse.json({ error: "Ride ID is required" }, { status: 400 });
        }

        const updateData: Record<string, unknown> = {
            status: status || undefined,
            paymentStatus: paymentStatus || undefined,
            paymentMethod: paymentMethod || undefined,
            customerPaymentPhone: customerPaymentPhone || undefined,
            driverPaymentPhone: driverPaymentPhone || undefined,
            fare: fare !== undefined ? parseFloat(fare) : undefined,
        };

        if (status === "IN_PROGRESS") {
            updateData.startedAt = new Date();
        } else if (status === "COMPLETED") {
            updateData.completedAt = new Date();
            updateData.paymentStatus = paymentStatus || "PAID";
        }

        if (driverId) {
            let driverRecord = await prisma.driverProfile.findUnique({
                where: { userId: driverId }
            });

            if (!driverRecord) {
                driverRecord = await prisma.driverProfile.findUnique({
                    where: { id: driverId }
                });
            }

            if (!driverRecord) {
                const targetUser = await prisma.user.findUnique({ where: { id: driverId } });
                
                if (targetUser && targetUser.role === "DRIVER") {
                    driverRecord = await prisma.driverProfile.create({
                        data: {
                            userId: driverId,
                            vehicleType: "Sedan",
                            licensePlate: "TBD",
                            driverLicense: "TBD",
                            isOnline: true
                        }
                    });
                } else if (targetUser) {
                    return NextResponse.json({ error: "Selected user is not a driver" }, { status: 400 });
                } else {
                    return NextResponse.json({ error: "Driver user not found" }, { status: 404 });
                }
            }

            if (driverRecord) {
                updateData.driverId = driverRecord.id;
            }
        }

        const updatedRide = await prisma.ride.update({
            where: { id },
            data: updateData,
            include: {
                rider: { select: { id: true, name: true, phone: true, email: true } },
                driver: {
                    include: {
                        user: { select: { id: true, name: true, phone: true, email: true } }
                    }
                },
            }
        });

        // Broadcast real-time SSE stream update
        let eventType: "RIDE_ACCEPTED" | "DRIVER_ARRIVED" | "RIDE_UPDATED" | "RIDE_CANCELLED" = "RIDE_UPDATED";
        if (status === "ACCEPTED" || (driverId && !updateData.status)) {
            eventType = "RIDE_ACCEPTED";
        } else if (status === "ARRIVED") {
            eventType = "DRIVER_ARRIVED";
        } else if (status === "CANCELLED") {
            eventType = "RIDE_CANCELLED";
            await prisma.rideOffer.updateMany({
                where: { rideId: id, status: "PENDING" },
                data: { status: "EXPIRED", respondedAt: new Date() },
            }).catch(() => {});
        }

        rideStreamManager.publish({
            type: eventType,
            rideId: updatedRide.id,
            driverId: updatedRide.driverId || undefined,
            data: updatedRide,
            timestamp: new Date().toISOString(),
        });

        if (driverId || updateData.status) {
            try {
                let actionName = "EDIT_RIDE";
                if (status === "ACCEPTED") actionName = "RIDE_ACCEPTED";
                else if (driverId) actionName = "ASSIGN_DRIVER";
                if (status === "EN_ROUTE") actionName = "DRIVER_EN_ROUTE";
                if (status === "ARRIVED") actionName = "DRIVER_ARRIVED";
                if (status === "IN_PROGRESS") actionName = "RIDE_STARTED";
                if (status === "COMPLETED") actionName = "RIDE_COMPLETED";

                const safeRiderName = updatedRide.rider?.name || updatedRide.guestName || 'Guest';
                const safeDriverName = updatedRide.driver?.user?.name || 'Driver';

                await prisma.dispatcherLog.create({
                    data: {
                        dispatcherId: user.userId,
                        action: actionName,
                        details: JSON.stringify({ 
                            rideId: id, 
                            driverId, 
                            status,
                            driverName: safeDriverName,
                            clientName: safeRiderName,
                            originAddress: updatedRide.originAddress,
                            destAddress: updatedRide.destAddress,
                        }),
                    }
                });
            } catch (err) {
                console.error("Failed to log dispatch action:", err);
            }
        }

        return NextResponse.json(updatedRide);
    } catch (error: unknown) {
        console.error("Ride update failed:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: "Update failed", details: message }, { status: 500 });
    }
}
