import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { sessionId, pickup, destination, payment } = body;

        if (!sessionId || !pickup || !destination) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Verify Session
        let session = null;
        if ((prisma as any).guestSession) {
            session = await (prisma as any).guestSession.findUnique({
                where: { id: sessionId }
            });
        } else {
            const res = await prisma.$queryRaw`SELECT * FROM "GuestSession" WHERE "id" = ${sessionId} LIMIT 1`;
            if (Array.isArray(res) && res.length > 0) session = res[0];
        }

        if (!session || !session.isActive) {
            return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
        }

        const guestPhone = session.phone;

        // Fallback: Use or create a placeholder Guest User (Same logic as manual dispatch)
        let guestUserId = null;
        const guestUser = await prisma.$queryRaw`SELECT id FROM "User" WHERE email = 'guest@libcab.com' LIMIT 1`;
        if (Array.isArray(guestUser) && guestUser.length > 0) {
            guestUserId = guestUser[0].id;
        } else {
            // Create if not exists (Raw SQL to avoid prisma types)
            const newId = `guest-user-${Date.now()}`;
            const now = new Date();
            await prisma.$executeRaw`
                INSERT INTO "User" ("id", "email", "name", "password", "role", "phone", "createdAt", "updatedAt")
                VALUES (${newId}, 'guest@libcab.com', 'Guest User', 'guest_placeholder_hash', 'RIDER', '0000000000', ${now}, ${now})
             `;
            guestUserId = newId;
        }

        // Append phone to origin for visibility
        const finalOrigin = `${pickup} [Guest: ${guestPhone}]`;

        // 2. Create Ride
        let ride: any = null;
        const isMobileMoney = payment === "MTN" || payment === "ORANGE";

        // Robust Path: Use standard Prisma create with known fields
        if (true) {
            ride = await (prisma as any).ride.create({
                data: {
                    riderId: guestUserId, // Use the placeholder user
                    // guestPhone, // Cannot use until server restart
                    originAddress: finalOrigin, // Use the visible origin
                    destAddress: destination,
                    // paymentMethod: payment || "CASH", // Cannot use until server restart
                    status: "REQUESTED",
                    originLat: 6.3156,
                    originLng: -10.8074,
                    destLat: 6.3156,
                    destLng: -10.8074,
                }
            });
            // Mock response enhancement
            ride.paymentMethod = payment;
            ride.guestPhone = guestPhone;
        }

        // 3. Handle Mobile Money Logic (Mock)
        if (isMobileMoney) {
            console.log(`[USSD PUSH] Initiating ${payment} payment for ${guestPhone}...`);
            console.log(`[USSD PUSH] Transaction created (Mock). Waiting for user approval on phone.`);
        }

        return NextResponse.json(ride);

    } catch (error: any) {
        console.error("Create Guest Ride Error:", error);
        return NextResponse.json({
            error: "Failed to create ride",
            details: error.message || String(error),
            meta: (error as any).meta,
            code: (error as any).code
        }, { status: 500 });
    }
}
