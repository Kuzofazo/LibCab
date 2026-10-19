import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { idempotencyStore } from "@/lib/idempotency";
import { rideStreamManager } from "@/lib/sse";
import { DispatchEngine } from "@/services/dispatchEngine";

export async function GET(req: Request) {
    try {
        const user = await verifyJWT(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        let whereClause: any = { isArchived: false };

        if (user.role === "DRIVER") {
            try {
                let driverProfileId = user.userId;
                let isApproved = true;
                let isOnline = true;

                const dp = await prisma.driverProfile.findUnique({
                    where: { userId: user.userId },
                    select: { id: true, approvalStatus: true, isOnline: true },
                }).catch(() => null);

                if (dp) {
                    driverProfileId = dp.id;
                    isApproved = dp.approvalStatus === "APPROVED";
                    isOnline = dp.isOnline;
                }

                const { checkDriverEligibility } = await import("@/lib/walletService");
                const eligibility = await checkDriverEligibility(driverProfileId);

                if (!isApproved || !isOnline || !eligibility.eligible) {
                    // Ineligible drivers only see rides assigned to them; they cannot receive unassigned requests
                    whereClause = {
                        isArchived: false,
                        driverId: driverProfileId,
                    };
                }
            } catch (err) {
                console.warn("Driver eligibility filter warning in GET rides:", err);
            }
        }

        const rides = await prisma.ride.findMany({
            where: whereClause,
            include: {
                rider: { select: { id: true, name: true, email: true, phone: true } },
                driver: {
                    include: {
                        user: { select: { id: true, name: true, phone: true, email: true } }
                    }
                },
                stops: { orderBy: { sequence: "asc" } },
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
        const user = await verifyJWT(req);
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
            fare,
            isScheduled,
            scheduledFor,
            notes,
            stops,
            promoCode
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

        // Determine if scheduled
        const isRideScheduled = Boolean(isScheduled && scheduledFor && new Date(scheduledFor).getTime() > Date.now() + 15 * 60 * 1000);
        const scheduledDate = isRideScheduled ? new Date(scheduledFor) : null;

        // Resolve selected driver if provided
        let resolvedDriverProfileId: string | undefined = undefined;
        let initialStatus = isRideScheduled ? "SCHEDULED" : "REQUESTED";

        if (driverId && !isRideScheduled) {
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

        // Fare Calculation & Promo Code Application
        let baseFare = fare !== undefined ? parseFloat(fare) : 25.0;
        let discountAmount = 0;
        let appliedCouponId: string | null = null;
        let appliedPromoCode: string | null = null;

        if (promoCode && typeof promoCode === "string" && promoCode.trim()) {
            const normalized = promoCode.trim().toUpperCase();
            const coupon = await prisma.coupon.findUnique({ where: { code: normalized } });
            if (coupon && coupon.isActive && new Date() <= new Date(coupon.expiry)) {
                // Minimum fare check
                if (!coupon.minFare || baseFare >= coupon.minFare) {
                    let discount = coupon.type === "PERCENTAGE" ? (baseFare * coupon.discount) / 100 : coupon.discount;
                    if (coupon.maxDiscount && discount > coupon.maxDiscount) discount = coupon.maxDiscount;
                    discountAmount = Math.min(discount, baseFare);
                    discountAmount = Math.round(discountAmount * 100) / 100;
                    appliedCouponId = coupon.id;
                    appliedPromoCode = coupon.code;
                }
            }
        }

        const finalFare = Math.max(0, Math.round((baseFare - discountAmount) * 100) / 100);

        // Generate cryptographic share token & human-friendly booking reference
        const cryptoModule = await import("crypto");
        const shareToken = cryptoModule.randomBytes(16).toString("hex");
        const shareExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const bookingRefPrefix = isRideScheduled ? "AC-SCH" : "AC";
        const randomRefSuffix = cryptoModule.randomBytes(3).toString("hex").toUpperCase();
        const bookingReference = `${bookingRefPrefix}-${randomRefSuffix}`;

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
                fare: finalFare,
                originalFare: discountAmount > 0 ? baseFare : undefined,
                discountAmount: discountAmount > 0 ? discountAmount : 0,
                promoCode: appliedPromoCode,
                status: initialStatus,
                paymentStatus: "PENDING",
                shareToken,
                shareExpiresAt,
                isSharingActive: true,
                bookingReference,
                isScheduled: isRideScheduled,
                scheduledFor: scheduledDate,
                scheduledStatus: isRideScheduled ? "CONFIRMED" : null,
                notes: notes || undefined,
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
                rider: { select: { id: true, name: true, phone: true, email: true } },
                driver: {
                    include: {
                        user: { select: { id: true, name: true, phone: true, email: true } }
                    }
                },
                stops: { orderBy: { sequence: "asc" } }
            }
        });

        // Record promo redemption if applied
        if (appliedCouponId && discountAmount > 0) {
            try {
                await prisma.couponRedemption.create({
                    data: {
                        couponId: appliedCouponId,
                        userId: finalRiderId,
                        phone: customerPaymentPhone || guestPhone || null,
                        rideId: newRide.id,
                        discountApplied: discountAmount
                    }
                });
                await prisma.coupon.update({
                    where: { id: appliedCouponId },
                    data: { timesUsed: { increment: 1 } }
                });
            } catch (couponErr) {
                console.warn("Failed to record coupon redemption:", couponErr);
            }
        }

        // Create Dispatcher Log for Admin Notification
        try {
            await prisma.dispatcherLog.create({
                data: {
                    dispatcherId: user.userId,
                    action: isRideScheduled ? "SCHEDULED_RIDE_BOOKED" : (initialStatus === "ACCEPTED" ? "RIDE_DIRECT_MATCHED" : "RIDE_REQUESTED"),
                    details: JSON.stringify({
                        rideId: newRide.id,
                        bookingReference: newRide.bookingReference,
                        clientName: newRide.guestName || newRide.rider?.name || "Client",
                        guestPhone: newRide.guestPhone,
                        originAddress: newRide.originAddress,
                        destAddress: newRide.destAddress,
                        stopsCount: newRide.stops?.length || 0,
                        vehicleType: newRide.vehicleType,
                        rideCategory: newRide.rideCategory,
                        paymentMethod: newRide.paymentMethod,
                        driverId: resolvedDriverProfileId,
                        driverName: newRide.driver?.user?.name,
                        isScheduled: isRideScheduled,
                        scheduledFor: newRide.scheduledFor,
                        promoCode: appliedPromoCode,
                        fare: newRide.fare
                    })
                }
            });
        } catch (logErr) {
            console.error("Failed to log ride request notification:", logErr);
        }

        // Trigger autonomous dispatch ONLY if not scheduled for later
        if (!isRideScheduled) {
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
        }

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
        const user = await verifyJWT(req);
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

            // ── Wallet Deposit Deduction on Ride Start ──────────────────────
            // Fetch the current ride to get driverId and check if already deducted
            const currentRide = await prisma.ride.findUnique({
                where: { id },
                select: { driverId: true, depositDeducted: true, fare: true },
            });

            if (currentRide?.driverId && !currentRide.depositDeducted) {
                try {
                    const { deductRideDeposit, calculateRideDeposit, checkDriverEligibility } = await import("@/lib/walletService");

                    const depositAmount = await calculateRideDeposit(currentRide.fare);
                    const eligibility = await checkDriverEligibility(currentRide.driverId);

                    if (!eligibility.eligible || eligibility.balance < depositAmount) {
                        return NextResponse.json({
                            error: `Insufficient wallet balance to start ride. Required deposit: ${depositAmount.toFixed(2)} LRD, Available: ${eligibility.balance.toFixed(2)} LRD.`,
                            code: "INSUFFICIENT_WALLET_BALANCE",
                            balance: eligibility.balance,
                            depositAmount,
                        }, { status: 402 });
                    }

                    const deductResult = await deductRideDeposit({
                        driverProfileId: currentRide.driverId,
                        rideId: id,
                        amount: depositAmount,
                        idempotencyKey: `ride-deposit-${id}`,
                        note: `Deposit for ride ${id}`,
                    });

                    if (!deductResult.success) {
                        return NextResponse.json({
                            error: deductResult.error || "Wallet deduction failed. Cannot start ride.",
                            code: "WALLET_DEDUCTION_FAILED",
                        }, { status: 402 });
                    }

                    // Broadcast wallet update to driver dashboard & admin in real time
                    try {
                        rideStreamManager.publish({
                            type: "WALLET_UPDATED",
                            driverId: currentRide.driverId,
                            data: {
                                driverId: currentRide.driverId,
                                balance: deductResult.balance,
                                deductedAmount: depositAmount,
                                rideId: id,
                            },
                            timestamp: new Date().toISOString(),
                        });
                    } catch {}
                } catch (walletErr) {
                    console.error("Wallet deduction error on ride start:", walletErr);
                }
            }
        } else if (status === "COMPLETED") {
            updateData.completedAt = new Date();
            updateData.paymentStatus = paymentStatus || "PAID";
        } else if (status === "CANCELLED") {
            try {
                const { refundRideDeposit } = await import("@/lib/walletService");
                await refundRideDeposit(id, "Refund for cancelled ride");
            } catch (refundErr) {
                console.error("Refund on ride cancellation error:", refundErr);
            }
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

        if (status === "IN_PROGRESS") {
            rideStreamManager.publish({
                type: "RIDE_STARTED",
                rideId: updatedRide.id,
                driverId: updatedRide.driverId || undefined,
                data: updatedRide,
                timestamp: new Date().toISOString(),
            });
        }

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
