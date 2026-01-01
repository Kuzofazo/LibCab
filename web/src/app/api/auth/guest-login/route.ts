import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
// import jwt from "jsonwebtoken"; // Optional for JWT token if we want to secure it

export async function POST(req: Request) {
    try {
        const { phone, code } = await req.json();

        if (!phone || !code) {
            return NextResponse.json({ error: "Phone and code required" }, { status: 400 });
        }

        let session: any = null;

        if ((prisma as any).guestSession) {
            session = await (prisma as any).guestSession.findUnique({
                where: { phone }
            });
        } else {
            // Raw fallback
            const res = await prisma.$queryRaw`SELECT * FROM "GuestSession" WHERE "phone" = ${phone} LIMIT 1`;
            if (Array.isArray(res) && res.length > 0) {
                session = res[0];
                // Prisma raw returns typical snake_case or whatever DB has. 
                // But we used defaults which are camelCase or PascalCase in Prisma? 
                // Postgres usually lowercase unless quoted. My create used quotes.
                // So columns should be "otpCode", "otpExpires".
            }
        }

        if (!session || session.otpCode !== code) {
            return NextResponse.json({ error: "Invalid OTP" }, { status: 401 });
        }

        if (new Date() > new Date(session.otpExpires)) {
            return NextResponse.json({ error: "OTP Expired" }, { status: 401 });
        }

        // Clear OTP after successful use
        if ((prisma as any).guestSession) {
            await (prisma as any).guestSession.update({
                where: { phone },
                data: { otpCode: null, otpExpires: null, isActive: true }
            });
        } else {
            await prisma.$executeRaw`
                UPDATE "GuestSession" 
                SET "otpCode" = NULL, "otpExpires" = NULL, "isActive" = true, "updatedAt" = ${new Date()}
                WHERE "phone" = ${phone}
             `;
        }

        // In a real app, we would issue a JWT here. 
        // For this MVP, we just return success and the frontend stores the phone as "session"

        return NextResponse.json({
            success: true,
            phone,
            sessionId: session.id
        });

    } catch (error) {
        console.error("Guest Login Error:", error);
        return NextResponse.json({ error: "Login failed" }, { status: 500 });
    }
}
