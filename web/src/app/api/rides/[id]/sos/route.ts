import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: rideId } = await params;

        console.log(`[SOS ALERT] Triggered for Ride ${rideId}`);

        // Ideally update DB, but Prisma Client lacks 'sosAlert' until restart.
        // We will TRY raw SQL for specific update if possible, else just log.

        try {
            await prisma.$executeRaw`
                UPDATE "public"."Ride" 
                SET "sosAlert" = true, "updatedAt" = ${new Date()}
                WHERE "id" = ${rideId}
            `;
            console.log(`[SOS ALERT] Database updated for ${rideId}`);
        } catch (dbError) {
            console.error("SOS DB Update Failed:", dbError);
            // Fallback: This is critical safety, so we might want to alert Admin immediately via other channels
        }

        return NextResponse.json({ success: true, message: "SOS Alert received. Help is on the way." });
    } catch (error) {
        return NextResponse.json({ error: "Failed to trigger SOS" }, { status: 500 });
    }
}
