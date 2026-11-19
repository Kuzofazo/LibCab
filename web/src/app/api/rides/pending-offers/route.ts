import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";

/**
 * GET /api/rides/pending-offers
 *
 * Returns the first active (non-expired, PENDING status) RideOffer assigned to the
 * authenticated driver, so the driver dashboard can surface a missed ride offer popup
 * when the driver comes online after the SSE event was already emitted.
 */
export async function GET(req: Request) {
    try {
        const user = await verifyJWT(req);
        if (!user || user.role !== "DRIVER") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Resolve driverProfile from userId
        const driverProfile = await prisma.driverProfile.findUnique({
            where: { userId: user.userId },
        });

        if (!driverProfile) {
            return NextResponse.json({ offer: null, ride: null });
        }

        // Find first non-expired PENDING offer for this driver
        const offer = await prisma.rideOffer.findFirst({
            where: {
                driverId: driverProfile.id,
                status: "PENDING",
                expiresAt: { gt: new Date() },
            },
            orderBy: { offeredAt: "desc" },
            include: {
                ride: {
                    include: {
                        rider: { select: { id: true, name: true, phone: true, email: true } },
                        driver: {
                            include: {
                                user: { select: { id: true, name: true, phone: true } },
                            },
                        },
                    },
                },
            },
        });

        if (!offer) {
            return NextResponse.json({ offer: null, ride: null });
        }

        const rideData = (offer as any).ride ?? null;

        return NextResponse.json({
            offer: {
                id: offer.id,
                rideId: offer.rideId,
                driverId: offer.driverId,
                status: offer.status,
                expiresAt: offer.expiresAt,
                offeredAt: offer.offeredAt,
            },
            ride: rideData,
        });
    } catch (error) {
        console.error("Pending offers API error:", error);
        return NextResponse.json({ error: "Failed to fetch pending offers" }, { status: 500 });
    }
}
