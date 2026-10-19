import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { rideStreamManager } from "@/lib/sse";
import { DispatchEngine } from "@/services/dispatchEngine";
import {
    estimateWhatsAppBookingFare,
    resolveCoordinates,
    formatWhatsAppDispatchMessage,
    buildWhatsAppLink,
    WhatsAppVehicleType,
    WhatsAppRideCategory,
    WhatsAppPaymentMethod
} from "@/utils/whatsappBooking";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            name,
            phone,
            pickup,
            destination,
            vehicleType = "Car",
            rideCategory = "Standard",
            paymentMethod = "MOMO",
            passengers = 1,
            notes = "",
            originLat: inputOriginLat,
            originLng: inputOriginLng,
            destLat: inputDestLat,
            destLng: inputDestLng,
        } = body;

        if (!pickup || !destination) {
            return NextResponse.json(
                { error: "Missing required fields: pickup and destination are required" },
                { status: 400 }
            );
        }

        const passengerName = (name && name.trim()) ? name.trim() : "WhatsApp Customer";
        const passengerPhone = (phone && phone.trim()) ? phone.trim() : "+231 77 000 0000";

        // 1. Resolve Geographic Coordinates if not supplied
        const pickupCoords = (inputOriginLat && inputOriginLng && inputOriginLat !== 0)
            ? { lat: Number(inputOriginLat), lng: Number(inputOriginLng) }
            : resolveCoordinates(pickup, 6.3006, -10.7969);

        const destCoords = (inputDestLat && inputDestLng && inputDestLat !== 0)
            ? { lat: Number(inputDestLat), lng: Number(inputDestLng) }
            : resolveCoordinates(destination, 6.3156, -10.8074);

        // 2. Calculate Distance & Estimated Fare
        const { fareUsd, distanceKm } = estimateWhatsAppBookingFare(
            pickup,
            destination,
            rideCategory as WhatsAppRideCategory,
            vehicleType as WhatsAppVehicleType
        );

        // 3. Resolve or Create Guest Session & User
        let guestUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { phone: passengerPhone },
                    { email: "guest@africab.com" }
                ]
            }
        });

        if (!guestUser) {
            const hashedPlaceholder = await bcrypt.hash(`wa_guest_${Date.now()}_${Math.random()}`, 10);
            guestUser = await prisma.user.create({
                data: {
                    email: `guest-${Date.now()}@africab.com`,
                    name: passengerName,
                    password: hashedPlaceholder,
                    role: "RIDER",
                    phone: passengerPhone,
                }
            });
        }

        try {
            await prisma.guestSession.upsert({
                where: { phone: passengerPhone },
                update: { isActive: true },
                create: { phone: passengerPhone, isActive: true }
            });
        } catch (sessErr) {
            console.warn("Guest session upsert warning in whatsapp booking:", sessErr);
        }

        // 4. Generate Share Token & Tracking Reference
        const shareToken = crypto.randomBytes(8).toString("hex");

        // 5. Create Ride in Database
        const ride = await prisma.ride.create({
            data: {
                riderId: guestUser.id,
                guestPhone: passengerPhone,
                guestName: passengerName,
                status: "REQUESTED",
                paymentStatus: "PENDING",
                originAddress: pickup.trim(),
                destAddress: destination.trim(),
                originLat: pickupCoords.lat,
                originLng: pickupCoords.lng,
                destLat: destCoords.lat,
                destLng: destCoords.lng,
                vehicleType,
                rideCategory,
                fare: fareUsd,
                distance: distanceKm,
                paymentMethod,
                customerPaymentPhone: passengerPhone,
                shareToken,
            },
            include: {
                rider: { select: { id: true, name: true, phone: true } }
            }
        });

        // 6. Broadcast Real-Time SSE Event
        try {
            rideStreamManager.broadcast({
                type: "RIDE_CREATED",
                ride: {
                    id: ride.id,
                    status: ride.status,
                    originAddress: ride.originAddress,
                    destAddress: ride.destAddress,
                    fare: ride.fare,
                    vehicleType: ride.vehicleType,
                    rideCategory: ride.rideCategory,
                    createdAt: ride.createdAt
                }
            });
        } catch (sseErr) {
            console.warn("SSE broadcast failed in whatsapp route:", sseErr);
        }

        // 7. Trigger Autonomous Dispatch Engine
        try {
            DispatchEngine.autoDispatchRide(ride.id).catch((err: unknown) =>
                console.error("Async dispatch error for whatsapp ride:", err)
            );
        } catch (dispatchErr) {
            console.warn("Dispatch engine trigger failed:", dispatchErr);
        }

        // 8. Generate Public Tracking URL & WhatsApp Dispatch Message
        const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_BASE_URL || "https://africab-liberia.com";
        const trackingUrl = `${origin}/track/${ride.id}?token=${shareToken}`;

        const formattedMessage = formatWhatsAppDispatchMessage({
            name: passengerName,
            phone: passengerPhone,
            pickup: ride.originAddress,
            destination: ride.destAddress,
            vehicleType: vehicleType as WhatsAppVehicleType,
            rideCategory: rideCategory as WhatsAppRideCategory,
            paymentMethod: paymentMethod as WhatsAppPaymentMethod,
            passengers: Number(passengers) || 1,
            notes: notes || "",
            rideId: ride.id,
            trackingUrl,
            estimatedFareUsd: fareUsd
        });

        const whatsappUrl = buildWhatsAppLink(formattedMessage);

        const shortRef = `AFR-WA-${ride.id.slice(-6).toUpperCase()}`;

        return NextResponse.json({
            success: true,
            rideId: ride.id,
            bookingReference: shortRef,
            trackingUrl,
            whatsappUrl,
            formattedMessage,
            fareUsd,
            distanceKm,
            ride
        });
    } catch (error: any) {
        console.error("WhatsApp booking error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to initiate WhatsApp dispatch booking" },
            { status: 500 }
        );
    }
}
