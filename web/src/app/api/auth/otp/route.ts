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
        await prisma.guestSession.upsert({
            where: { phone },
            update: { otpCode: otp, otpExpires: expires },
            create: { phone, otpCode: otp, otpExpires: expires }
        });

        await sendOTP(phone, otp);

        return NextResponse.json({ message: "OTP sent" });
    } catch (error) {
        console.error("OTP Request Error:", error);
        return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
    }
}
