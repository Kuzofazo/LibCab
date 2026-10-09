import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        const user = await verifyJWT();
        
        if (!user || user.role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Unauthorized access" }, { status: 403 });
        }

        const body = await req.json();
        const { actionType, filter } = body;
        
        // actionType: "CLEAR_REQUESTS" | "CLEAR_HISTORY" | "CLEAR_ALL"
        // filter: "CANCELLED", "ALL", driverId, riderId etc.

        if (!actionType) {
            return NextResponse.json({ error: "Missing action type" }, { status: 400 });
        }

        let updatedCount = 0;
        let details = "";

        if (actionType === "CLEAR_REQUESTS") {
            // Soft delete requests based on filter
            if (filter === "CANCELLED") {
                const res = await prisma.ride.updateMany({
                    where: { 
                        status: "CANCELLED",
                        isArchived: false
                    },
                    data: { isArchived: true }
                });
                updatedCount = res.count;
                details = `Archived ${updatedCount} cancelled requests.`;
            } else if (filter === "ALL") {
                const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
                const res = await prisma.ride.updateMany({
                    where: { 
                        isArchived: false,
                        OR: [
                            { status: { in: ["CANCELLED", "COMPLETED"] } },
                            { 
                                status: { in: ["REQUESTED", "ACCEPTED"] },
                                createdAt: { lt: twelveHoursAgo }
                            }
                        ]
                    },
                    data: { isArchived: true }
                });
                updatedCount = res.count;
                details = `Archived ${updatedCount} records (including completed, cancelled, and stale requests).`;
            } else {
                return NextResponse.json({ error: "Invalid filter for CLEAR_REQUESTS" }, { status: 400 });
            }
        } else if (actionType === "CLEAR_HISTORY") {
            const { driverId, riderId } = filter;
            if (driverId) {
                const res = await prisma.ride.updateMany({
                    where: { 
                        driverId: driverId,
                        isArchived: false
                    },
                    data: { isArchived: true }
                });
                updatedCount = res.count;
                details = `Archived ${updatedCount} ride records for driver ${driverId}.`;
            } else if (riderId) {
                const res = await prisma.ride.updateMany({
                    where: { 
                        riderId: riderId,
                        isArchived: false
                    },
                    data: { isArchived: true }
                });
                updatedCount = res.count;
                details = `Archived ${updatedCount} ride records for rider ${riderId}.`;
            } else {
                 return NextResponse.json({ error: "No target user provided for CLEAR_HISTORY" }, { status: 400 });
            }
        } else if (actionType === "CLEAR_ALL") {
            const res = await prisma.ride.updateMany({
                where: { isArchived: false },
                data: { isArchived: true }
            });
            updatedCount = res.count;
            details = `Wiped ${updatedCount} ride records globally across all environments.`;
        } else {
            return NextResponse.json({ error: "Unknown actionType" }, { status: 400 });
        }

        // Log the action to DispatcherLog
        await prisma.dispatcherLog.create({
            data: {
                dispatcherId: user.userId || "System",
                action: actionType,
                details: details
            }
        });

        return NextResponse.json({ success: true, count: updatedCount, details });

    } catch (error) {
        console.error("Data clearance error:", error);
        return NextResponse.json({ error: "Failed to clear data" }, { status: 500 });
    }
}
