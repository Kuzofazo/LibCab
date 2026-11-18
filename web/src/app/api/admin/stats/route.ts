import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
};

export async function GET(req: Request) {
    try {
        // Require admin auth
        const payload = await verifyJWT(req);
        if (!payload || (payload.role !== "SUPER_ADMIN" && payload.role !== "ADMIN")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_CACHE_HEADERS });
        }

        const [totalUsers, activeDrivers, pendingRides, totalRevenue] = await Promise.all([
            prisma.user.count(),
            prisma.driverProfile.count({ where: { isOnline: true } }),
            prisma.ride.count({ where: { status: 'REQUESTED' } }),
            prisma.ride.aggregate({
                where: { paymentStatus: 'PAID' },
                _sum: { fare: true }
            })
        ]);

        const result = {
            totalUsers,
            activeDrivers,
            pendingRides,
            totalRevenue: totalRevenue._sum.fare || 0
        };

        return NextResponse.json(result, { headers: NO_CACHE_HEADERS });
    } catch (error) {
        console.error("Dashboard stats error:", error);
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500, headers: NO_CACHE_HEADERS });
    }
}
