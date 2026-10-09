import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";

export async function GET() {
    try {
        const user = await verifyJWT();
        if (!user || user.role !== "DRIVER") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get the driver profile since ride links to driverId which is DriverProfile ID
        const driverProfile = await prisma.driverProfile.findUnique({
            where: { userId: user.userId }
        });

        if (!driverProfile) {
            return NextResponse.json({ error: "Driver profile not found" }, { status: 404 });
        }

        // Find an active assigned ride. We use "ACCEPTED" as the dispatch system uses it for assignment right now.
        const ride = await prisma.ride.findFirst({
            where: {
                driverId: driverProfile.id,
                status: { in: ["ACCEPTED", "ASSIGNED"] }
            },
            include: {
                rider: { select: { name: true, phone: true } }
            },
            orderBy: { createdAt: "desc" }
        });

        if (!ride) {
            return NextResponse.json({ message: "No active assignments" });
        }

        return NextResponse.json(ride);
    } catch (error) {
        console.error("GET assignment error:", error);
        return NextResponse.json({ error: "Failed to fetch assignment" }, { status: 500 });
    }
}
