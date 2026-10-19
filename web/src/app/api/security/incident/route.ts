import { NextResponse } from "next/server";
import { reportSecurityIntrusion, extractClientSecurityMetadata, isIpBlocked } from "@/lib/securityGuard";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const headers = req.headers;

        const clientMeta = extractClientSecurityMetadata(headers);

        const incident = {
            ip: body.ip || clientMeta.ip,
            city: body.city || clientMeta.city,
            region: body.region || clientMeta.region,
            country: body.country || clientMeta.country,
            latitude: body.latitude || clientMeta.latitude,
            longitude: body.longitude || clientMeta.longitude,
            deviceFingerprint: body.deviceFingerprint || clientMeta.deviceFingerprint,
            userAgent: body.userAgent || clientMeta.userAgent,
            attemptedUsername: body.attemptedUsername || "Anonymous Attacker",
            attackType: body.attackType || "HONEYPOT_PROBE",
            targetUrl: body.targetUrl || "/",
            requestMethod: body.requestMethod || "GET",
            maliciousPayload: body.maliciousPayload || "Suspicious signature",
            severity: body.severity || "HIGH"
        };

        await reportSecurityIntrusion(incident as any);

        return NextResponse.json({
            success: true,
            status: "BLOCKED_AND_LOGGED",
            message: "Intrusion attempt intercepted and reported to Admin Dashboard",
            incident
        });
    } catch (error: any) {
        console.error("Security Incident Reporting Error:", error);
        return NextResponse.json({ error: "Failed to record security incident" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const user = await verifyJWT(req);
        if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
            return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 401 });
        }

        const logs = await prisma.dispatcherLog.findMany({
            where: { action: "SECURITY_INTRUSION_ALERT" },
            orderBy: { createdAt: "desc" },
            take: 50
        });

        const incidents = logs.map(l => {
            let parsed = {};
            try {
                parsed = JSON.parse(l.details || "{}");
            } catch {}
            return {
                id: l.id,
                createdAt: l.createdAt,
                ...parsed
            };
        });

        return NextResponse.json({
            count: incidents.length,
            incidents
        });
    } catch (error: any) {
        return NextResponse.json({ error: "Failed to retrieve security incidents" }, { status: 500 });
    }
}
