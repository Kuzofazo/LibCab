import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        const user = await verifyJWT(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const query = searchParams.get("q") || "";
        const status = searchParams.get("status") || "ALL";
        const category = searchParams.get("category") || "ALL";
        const fromDate = searchParams.get("from");
        const toDate = searchParams.get("to");
        const page = parseInt(searchParams.get("page") || "1", 10);
        const limit = parseInt(searchParams.get("limit") || "15", 10);
        const skip = (page - 1) * limit;

        const whereClause: any = {
            isArchived: false,
        };

        // Data Isolation: Rider only sees their own rides; Driver sees assigned rides; Admin sees all
        if (user.role === "RIDER") {
            whereClause.riderId = user.userId;
        } else if (user.role === "DRIVER") {
            const dp = await prisma.driverProfile.findUnique({ where: { userId: user.userId } });
            whereClause.driverId = dp?.id || user.userId;
        }

        // Status Filter
        if (status && status !== "ALL") {
            if (status === "SCHEDULED") {
                whereClause.isScheduled = true;
            } else {
                whereClause.status = status;
            }
        }

        // Category Filter
        if (category && category !== "ALL") {
            whereClause.rideCategory = category;
        }

        // Search by booking reference, origin, or destination
        if (query.trim()) {
            whereClause.OR = [
                { bookingReference: { contains: query.trim(), mode: "insensitive" } },
                { originAddress: { contains: query.trim(), mode: "insensitive" } },
                { destAddress: { contains: query.trim(), mode: "insensitive" } },
                { id: { contains: query.trim(), mode: "insensitive" } },
            ];
        }

        // Date Range Filter
        if (fromDate || toDate) {
            whereClause.createdAt = {};
            if (fromDate) whereClause.createdAt.gte = new Date(fromDate);
            if (toDate) whereClause.createdAt.lte = new Date(toDate);
        }

        const [totalCount, rides] = await Promise.all([
            prisma.ride.count({ where: whereClause }),
            prisma.ride.findMany({
                where: whereClause,
                include: {
                    rider: { select: { id: true, name: true, phone: true, email: true } },
                    driver: {
                        include: {
                            user: { select: { id: true, name: true, phone: true } }
                        }
                    },
                    stops: { orderBy: { sequence: "asc" } },
                    payments: true,
                    reviews: true,
                    lostItemReports: true,
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            })
        ]);

        return NextResponse.json({
            rides,
            pagination: {
                total: totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        console.error("GET ride history error:", error);
        return NextResponse.json({ error: "Failed to fetch ride history" }, { status: 500 });
    }
}
