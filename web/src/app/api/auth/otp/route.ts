import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateOTP, sendOTP } from "@/lib/otp";
import { Prisma } from "@prisma/client";

export async function POST(req: Request) {
    try {
        const { phone } = await req.json();

        if (!phone) {
            return NextResponse.json({ error: "Phone number required" }, { status: 400 });
        }

        const otp = generateOTP();
        const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Create or update guest session with new OTP
        if ((prisma as any).guestSession) {
            const existing = await (prisma as any).guestSession.findUnique({
                where: { phone }
            });

            if (existing) {
                await (prisma as any).guestSession.update({
                    where: { phone },
                    data: { otpCode: otp, otpExpires: expires }
                });
            } else {
                await (prisma as any).guestSession.create({
                    data: { phone, otpCode: otp, otpExpires: expires }
                });
            }
        } else {
            // Raw Fallback
            // Check existence
            const existing = await prisma.$queryRaw`SELECT * FROM "GuestSession" WHERE "phone" = ${phone}`;
            if (Array.isArray(existing) && existing.length > 0) {
                await prisma.$executeRaw`
                    UPDATE "GuestSession" 
                    SET "otpCode" = ${otp}, "otpExpires" = ${expires}, "updatedAt" = ${new Date()}
                    WHERE "phone" = ${phone}
                 `;
            } else {
                const id = `guest-${Date.now()}`;
                await prisma.$executeRaw`
                    INSERT INTO "GuestSession" ("id", "phone", "otpCode", "otpExpires", "isActive", "createdAt", "updatedAt")
                    VALUES (${id}, ${phone}, ${otp}, ${expires}, true, ${new Date()}, ${new Date()})
                `;
            }
        }

        await sendOTP(phone, otp);

        return NextResponse.json({ message: "OTP sent" });
    } catch (error) {
        console.error("OTP Request Error:", error);
        return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
    }
}
