import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";
import { memoryCache } from "@/lib/cache";

const RECENT_RIDES_KEY = "admin_recent_rides";

// Lightweight endpoint: returns only the 4 most recent rides for the dashboard
// Much faster than GET /api/rides which returns all rides with full includes
export async function GET() {
    try {
        const user = await verifyJWT();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const cached = memoryCache.get<object[]>(RECENT_RIDES_KEY);
        if (cached) return NextResponse.json(cached);

        const rides = await prisma.ride.findMany({
            where: { isArchived: false },
            select: {
                id: true,
                status: true,
                createdAt: true,
                originAddress: true,
                destAddress: true,
                rider: { select: { name: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 4,
        });

        memoryCache.set(RECENT_RIDES_KEY, rides, 15);
        return NextResponse.json(rides);
    } catch (error) {
        console.error("Recent rides error (using fallback):", error);
        return NextResponse.json([]);
    }
}
