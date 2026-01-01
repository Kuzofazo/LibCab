import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
    try {
        const rides = await prisma.ride.findMany({
            include: {
                rider: { select: { name: true, email: true } },
                driver: { include: { user: { select: { name: true } } } },
            },
            orderBy: { createdAt: "desc" },
        });
        return NextResponse.json(rides);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch rides" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { riderId, guestPhone, originAddress, destAddress, originLat, originLng, destLat, destLng, vehicleType } = body;

        // Either riderId or guestPhone is required
        if ((!riderId && !guestPhone) || !originAddress || !destAddress) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        let finalRiderId = riderId;
        let finalOrigin = originAddress;

        if (!finalRiderId) {
            // Fallback: Use or create a placeholder Guest User
            // check if user exists
            let guestUser = await prisma.user.findUnique({ where: { email: "guest@libcab.com" } });
            if (!guestUser) {
                // Create it
                // Password hash required? User model has password?
                // Note: User create might require password.
                // We'll try to create with dummy password.
                // Need to import hash? Or just store plain text if my logic allows? 
                // Schema says String.
                // We'll just put "guest123".
                guestUser = await prisma.user.create({
                    data: {
                        email: "guest@libcab.com",
                        name: "Guest User",
                        password: "guest_placeholder_password_hash",
                        role: "RIDER",
                        phone: "0000000000"
                    }
                });
            }
            finalRiderId = guestUser.id;

            // Hack: Append guest phone to origin address so dispatcher sees it
            if (guestPhone) {
                finalOrigin = `${originAddress} [Guest: ${guestPhone}]`;
            }
        }

        const newRide = await prisma.ride.create({
            data: {
                riderId: finalRiderId,
                originAddress: finalOrigin,
                destAddress,
                originLat: originLat || 0,
                originLng: originLng || 0,
                destLat: destLat || 0,
                destLng: destLng || 0,
                vehicleType: vehicleType || "Sedan",
                status: "REQUESTED",
                paymentStatus: "PENDING",
            },
            include: {
                rider: { select: { name: true } }
            }
        });

        return NextResponse.json(newRide);

    } catch (error: any) {
        console.error("Ride creation error:", error);
        return NextResponse.json({ error: "Failed to create ride", details: error.message || String(error) }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const { id, status, driverId, paymentStatus } = body;

        if (!id) {
            return NextResponse.json({ error: "Ride ID is required" }, { status: 400 });
        }

        const updatedRide = await prisma.ride.update({
            where: { id },
            data: {
                status: status || undefined,
                driverId: driverId || undefined,
                paymentStatus: paymentStatus || undefined,
            },
            include: {
                rider: { select: { name: true } },
                driver: { include: { user: { select: { name: true } } } },
            }
        });

        return NextResponse.json(updatedRide);
    } catch (error) {
        return NextResponse.json({ error: "Update failed" }, { status: 400 });
    }
}
