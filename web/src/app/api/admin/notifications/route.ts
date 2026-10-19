import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";


export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const sinceParam = url.searchParams.get("since");
        const sinceDate = sinceParam ? new Date(parseInt(sinceParam)) : new Date(Date.now() - 30000); // Default to last 30s

        const logs = await prisma.dispatcherLog.findMany({
            where: {
                action: { in: ["SECURITY_INTRUSION_ALERT", "EMERGENCY_SOS_PANIC", "DRIVER_ARRIVED", "RIDE_STARTED", "RIDE_COMPLETED", "RIDE_REQUESTED", "RIDE_ACCEPTED"] },
                createdAt: { gt: sinceDate }
            },
            orderBy: { createdAt: "asc" }
        });

        // Current server time to pass back to client for accurate 'since' in next poll
        return NextResponse.json({
            timestamp: Date.now(),
            events: logs.map(log => {
                let parsedOpts = {};
                try {
                    parsedOpts = JSON.parse(log.details || "{}");
                } catch(e) {}
                
                return {
                    id: log.id,
                    action: log.action,
                    createdAt: log.createdAt,
                    details: parsedOpts
                };
            })
        });
    } catch (error) {
        console.error("Notifications API Error:", error);
        return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
    }
}
