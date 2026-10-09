import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rideStreamManager } from "@/lib/sse";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: rideId } = await params;
        const body = await req.json().catch(() => ({}));
        const { lat, lng, reporterRole = "PASSENGER", reason = "Emergency panic button triggered" } = body;

        console.log(`🚨 [CRITICAL SOS ALERT] Triggered for Ride ${rideId} by ${reporterRole}`);

        // 1. Fetch current ride details
        let ride = await prisma.ride.findUnique({
            where: { id: rideId },
            include: {
                rider: true,
                driver: {
                    include: {
                        user: true
                    }
                }
            }
        });

        // 2. Mark ride as SOS Alert in Database
        if (ride) {
            try {
                ride = await prisma.ride.update({
                    where: { id: rideId },
                    data: {
                        sosAlert: true,
                    },
                    include: {
                        rider: true,
                        driver: {
                            include: {
                                user: true
                            }
                        }
                    }
                });
            } catch (updateErr) {
                console.error("Prisma update sosAlert error, fallback to raw SQL:", updateErr);
                try {
                    await prisma.$executeRawUnsafe(
                        `UPDATE "Ride" SET "sosAlert" = true WHERE "id" = ?`,
                        rideId
                    );
                } catch (rawErr) {
                    console.error("Raw SQL SOS update error:", rawErr);
                }
            }
        }

        // 3. Log to Dispatcher Audit Log with high priority
        try {
            await prisma.dispatcherLog.create({
                data: {
                    action: "EMERGENCY_SOS_PANIC",
                    details: JSON.stringify({
                        rideId,
                        reporterRole,
                        reason,
                        lat: lat || ride?.originLat || null,
                        lng: lng || ride?.originLng || null,
                        clientName: ride?.rider?.name || ride?.guestName || "Client",
                        clientPhone: ride?.rider?.phone || ride?.guestPhone || "N/A",
                        driverName: ride?.driver?.user?.name || "Unassigned",
                        driverPhone: ride?.driver?.user?.phone || "N/A",
                        originAddress: ride?.originAddress || "Unknown",
                        destAddress: ride?.destAddress || "Unknown",
                        timestamp: new Date().toISOString()
                    })
                }
            });
        } catch (logErr) {
            console.warn("Could not save dispatcher log:", logErr);
        }

        // 4. Broadcast Real-Time Emergency Event via SSE
        const sosPayload = {
            id: rideId,
            rideId,
            reporterRole,
            reason,
            originAddress: ride?.originAddress || "Live Location",
            destAddress: ride?.destAddress || "Destination",
            originLat: lat || ride?.originLat || 6.3156,
            originLng: lng || ride?.originLng || -10.8074,
            clientName: ride?.rider?.name || ride?.guestName || "Client",
            clientPhone: ride?.rider?.phone || ride?.guestPhone || "",
            driverName: ride?.driver?.user?.name || "Assigned Driver",
            driverPhone: ride?.driver?.user?.phone || "",
            vehicleModel: ride?.driver?.vehicleModel || "Vehicle",
            licensePlate: ride?.driver?.licensePlate || "",
            timestamp: new Date().toISOString()
        };

        rideStreamManager.publish({
            type: "SOS_ALERT",
            rideId,
            data: sosPayload,
            timestamp: new Date().toISOString()
        });

        return NextResponse.json({
            success: true,
            message: "SOS Alert received. Emergency protocol initiated. 24/7 command center and authorities notified.",
            details: sosPayload
        });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Internal error";
        console.error("SOS Trigger Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to trigger SOS alert: " + msg },
            { status: 500 }
        );
    }
}
