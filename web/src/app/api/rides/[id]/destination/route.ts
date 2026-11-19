import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";
import { rideStreamManager } from "@/lib/sse";
import { memoryCache } from "@/lib/cache";

export async function PATCH(
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

        const body = await req.json();
        const {
            newDestAddress,
            newDestLat,
            newDestLng,
            newDistanceKm,
            newFare,
        } = body;

        if (!newDestAddress) {
            return NextResponse.json({ error: "New destination address is required" }, { status: 400 });
        }

        const ride = await prisma.ride.findUnique({
            where: { id: rideId },
            include: {
                stops: { orderBy: { sequence: "asc" } },
                driver: {
                    include: {
                        user: { select: { id: true, name: true, phone: true, email: true } }
                    }
                },
                rider: { select: { id: true, name: true, phone: true, email: true } }
            }
        });

        if (!ride) {
            return NextResponse.json({ error: "Ride not found" }, { status: 404 });
        }

        if (["COMPLETED", "CANCELLED"].includes(ride.status)) {
            return NextResponse.json({ error: "Cannot modify destination for a completed or cancelled ride." }, { status: 400 });
        }

        const parsedDestLat = newDestLat !== undefined && !isNaN(Number(newDestLat)) ? Number(newDestLat) : ride.destLat;
        const parsedDestLng = newDestLng !== undefined && !isNaN(Number(newDestLng)) ? Number(newDestLng) : ride.destLng;
        const previousDest = ride.destAddress;
        const previousFare = ride.fare || 25.0;

        let finalFare = previousFare;
        let originalFare = ride.originalFare;

        if (newFare !== undefined && !isNaN(Number(newFare))) {
            const calculatedFare = Math.max(10.0, Number(newFare));
            if (calculatedFare !== previousFare) {
                if (!originalFare) {
                    originalFare = previousFare;
                }
                finalFare = calculatedFare;
            }
        }

        const noteUpdate = ride.notes
            ? `${ride.notes} · [Destination updated from "${previousDest}" to "${newDestAddress}"]`
            : `[Destination updated from "${previousDest}" to "${newDestAddress}"]`;

        const updatedRide = await prisma.ride.update({
            where: { id: rideId },
            data: {
                destAddress: newDestAddress,
                destLat: parsedDestLat,
                destLng: parsedDestLng,
                fare: finalFare,
                originalFare: originalFare || undefined,
                distance: newDistanceKm !== undefined ? Number(newDistanceKm) : ride.distance,
                notes: noteUpdate,
            },
            include: {
                stops: { orderBy: { sequence: "asc" } },
                driver: {
                    include: {
                        user: { select: { id: true, name: true, phone: true, email: true } }
                    }
                },
                rider: { select: { id: true, name: true, phone: true, email: true } }
            }
        });

        // Invalidate cache
        try {
            memoryCache.delete(`ride_details_${rideId}`);
        } catch {}

        // Broadcast DESTINATION_CHANGED and ROUTE_UPDATED to Driver and Passenger
        const routeChangePayload = {
            rideId: updatedRide.id,
            bookingReference: updatedRide.bookingReference,
            previousDest,
            newDestAddress,
            newDestLat: parsedDestLat,
            newDestLng: parsedDestLng,
            previousFare,
            newFare: finalFare,
            fareDifference: finalFare - previousFare,
            ride: updatedRide,
            message: `Destination changed to: ${newDestAddress}`
        };

        rideStreamManager.publish({
            type: "DESTINATION_CHANGED",
            rideId: updatedRide.id,
            driverId: updatedRide.driverId || undefined,
            data: routeChangePayload,
            timestamp: new Date().toISOString()
        });

        rideStreamManager.publish({
            type: "ROUTE_UPDATED",
            rideId: updatedRide.id,
            driverId: updatedRide.driverId || undefined,
            data: routeChangePayload,
            timestamp: new Date().toISOString()
        });

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
                    action: "PASSENGER_DESTINATION_CHANGED",
                    details: JSON.stringify({
                        rideId: updatedRide.id,
                        bookingReference: updatedRide.bookingReference,
                        from: previousDest,
                        to: newDestAddress,
                        previousFare,
                        newFare: finalFare,
                        changedBy: user.role
                    })
                }
            });
        } catch {}

        return NextResponse.json({
            success: true,
            message: "Destination updated successfully",
            fareChanged: finalFare !== previousFare,
            previousFare,
            newFare: finalFare,
            ride: updatedRide
        });

    } catch (error: any) {
        console.error("Change destination API error:", error);
        return NextResponse.json({
            error: "Failed to update destination",
            details: error.message || String(error)
        }, { status: 500 });
    }
}
