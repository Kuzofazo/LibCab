import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
    // 1. Rate Limiting check
    const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
    const limitStatus = rateLimit(`guest_login_${ip}`, { limit: 5, windowMs: 60000 }); // 5 limits per minute
    
    if (!limitStatus.success) {
        logger.warn({ message: "Rate limit exceeded on guest login", context: { ip }});
        return NextResponse.json({ error: "Too many login attempts, please try again later." }, { status: 429 });
    }

    try {
        const { phone } = await req.json();

        if (!phone) {
            return NextResponse.json({ error: "Phone is required" }, { status: 400 });
        }

        const session = await prisma.guestSession.upsert({
            where: { phone },
            update: { isActive: true },
            create: { phone, isActive: true }
        });

        logger.info({ message: "Guest login successful", userId: session.id, context: { phone }});

        return NextResponse.json({
            success: true,
            phone,
            sessionId: session.id
        });

    } catch (error) {
        logger.error({ message: "Guest Login Error", error, context: { ip }});
        return NextResponse.json({ error: "Login failed" }, { status: 500 });
    }
}
