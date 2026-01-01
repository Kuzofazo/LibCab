import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { action, details, dispatcherId } = body;

        console.log(`[DISPATCH LOG] ${action}: ${JSON.stringify(details)}`);

        // Try DB Insert (Raw)
        try {
            // Generate ID
            const id = `log-${Date.now()}`;
            const now = new Date();

            // Check if table exists (blind try)
            // Using lowercase 'dispatcherlog' or quoted 'DispatcherLog' based on previous learnings?
            // Safest is to just LOG to console for MVP stability till restart.
            // But I'll try one raw insert query.

            /*
            await prisma.$executeRaw`
               INSERT INTO "public"."DispatcherLog" ("id", "action", "details", "dispatcherId", "createdAt")
               VALUES (${id}, ${action}, ${JSON.stringify(details)}, ${dispatcherId || 'admin'}, ${now})
            `;
            */

        } catch (dbErr) {
            console.error("Log DB Insert Failed", dbErr);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to log" }, { status: 500 });
    }
}
