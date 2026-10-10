import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";

export async function GET() {
    try {
        const user = await verifyJWT();
        if (!user || user.role !== "DRIVER") {
            return NextResponse.json({ error: "Unauthorized. Driver access only." }, { status: 401 });
        }

        const driverProfile = await prisma.driverProfile.findUnique({
            where: { userId: user.userId },
        });

        if (!driverProfile) {
            return NextResponse.json({ offers: [] });
        }

        const now = new Date();

        // Find offers that are still PENDING and have not expired, and whose ride is still REQUESTED and unassigned
        const offers = await prisma.rideOffer.findMany({
            where: {
                driverId: driverProfile.id,
                status: "PENDING",
                expiresAt: { gt: now },
                ride: {
                    status: "REQUESTED",
                    driverId: null,
                },
            },
            include: {
                ride: {
                    include: {
                        rider: { select: { name: true, phone: true } },
                    },
                },
            },
            orderBy: { offeredAt: "desc" },
            take: 5,
        });

        const formatted = offers.map((offer) => ({
            id: offer.id,
            rideId: offer.rideId,
            status: offer.status,
            distanceKm: offer.distanceKm,
            etaMinutes: offer.etaMinutes,
            expiresAt: offer.expiresAt,
            offeredAt: offer.offeredAt,
            remainingSeconds: Math.max(0, Math.floor((offer.expiresAt.getTime() - now.getTime()) / 1000)),
            ride: offer.ride,
        }));

        return NextResponse.json({ offers: formatted });
    } catch (error) {
        console.error("Pending offers fetch error:", error);
        return NextResponse.json({ error: "Failed to fetch pending offers" }, { status: 500 });
    }
}
