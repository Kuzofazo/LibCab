import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rideStreamManager } from "@/lib/sse";

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const { userId, role = "DRIVER", lat, lng, locationText, reason = "Emergency Alert Triggered" } = body;

        console.log(`🚨 [CRITICAL GENERAL SOS] Triggered by ${role} (User: ${userId || "Anonymous"})`);

        let user = null;
        if (userId) {
            user = await prisma.user.findUnique({
                where: { id: userId },
                include: { driverProfile: true }
            });
        }

        const sosPayload = {
            id: `sos-${Date.now()}`,
            userId: userId || "Unknown",
            reporterRole: role,
            reason,
            originAddress: locationText || "Monrovia Corridor",
            originLat: lat || 6.3156,
            originLng: lng || -10.8074,
            clientName: user?.name || "AfriCab User",
            clientPhone: user?.phone || "",
            timestamp: new Date().toISOString()
        };

        try {
            await prisma.dispatcherLog.create({
                data: {
                    action: "EMERGENCY_SOS_PANIC",
                    details: JSON.stringify(sosPayload)
                }
            });
        } catch (logErr) {
            console.warn("Log creation failed:", logErr);
        }

        rideStreamManager.publish({
            type: "SOS_ALERT",
            data: sosPayload,
            timestamp: new Date().toISOString()
        });

        return NextResponse.json({
            success: true,
            message: "Emergency distress signal broadcast to Monrovia Command Center.",
            details: sosPayload
        });
    } catch (err: any) {
        console.error("General SOS error:", err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
