import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
    try {
        const [totalUsers, activeDrivers, pendingRides, totalRevenue] = await Promise.all([
            prisma.user.count(),
            prisma.driverProfile.count({ where: { isOnline: true } }),
            prisma.ride.count({ where: { status: 'REQUESTED' } }),
            prisma.ride.aggregate({
                where: { paymentStatus: 'PAID' },
                _sum: { fare: true }
            })
        ]);

        return NextResponse.json({
            totalUsers,
            activeDrivers,
            pendingRides,
            totalRevenue: totalRevenue._sum.fare || 0
        });
    } catch (error) {
        console.error("Dashboard stats error", error);
        return NextResponse.json({ error: "Failed to fetch dashboard stats" }, { status: 500 });
    }
}
