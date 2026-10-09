import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const category = searchParams.get("category");

        const orgs = await prisma.fleetOrganization.findMany({
            where: {
                ...(category && category !== "ALL" ? { category } : {})
            },
            include: {
                assets: {
                    select: {
                        id: true,
                        status: true,
                        assetType: true,
                        speed: true
                    }
                }
            },
            orderBy: { name: "asc" }
        });

        const formatted = orgs.map(org => {
            const total = org.assets.length;
            const active = org.assets.filter(a => a.status === "ACTIVE" || a.status === "IN_TRANSIT").length;
            const inTransit = org.assets.filter(a => a.status === "IN_TRANSIT").length;
            const idle = org.assets.filter(a => a.status === "IDLE").length;
            const maintenance = org.assets.filter(a => a.status === "MAINTENANCE").length;

            return {
                id: org.id,
                name: org.name,
                code: org.code,
                category: org.category,
                email: org.email,
                phone: org.phone,
                contactPerson: org.contactPerson,
                plan: org.plan,
                apiKey: org.apiKey,
                status: org.status,
                totalAssets: total,
                activeAssets: active,
                inTransitAssets: inTransit,
                idleAssets: idle,
                maintenanceAssets: maintenance
            };
        });

        return NextResponse.json(formatted);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        console.error("Fleet organizations API error:", error);
        return NextResponse.json({ error: "Failed to fetch fleet organizations", details: msg }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, code, category = "LOGISTICS", email, phone, contactPerson, plan = "ENTERPRISE" } = body;

        if (!name || !code) {
            return NextResponse.json({ error: "Name and Organization Code are required" }, { status: 400 });
        }

        const cleanCode = code.trim().toUpperCase().replace(/\s+/g, "-");

        const existing = await prisma.fleetOrganization.findUnique({ where: { code: cleanCode } });
        if (existing) {
            return NextResponse.json({ error: "Organization code already in use" }, { status: 400 });
        }

        const apiKey = `flt_live_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;

        const newOrg = await prisma.fleetOrganization.create({
            data: {
                name,
                code: cleanCode,
                category,
                email,
                phone,
                contactPerson,
                plan,
                apiKey,
                status: "ACTIVE"
            }
        });

        return NextResponse.json(newOrg, { status: 201 });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        console.error("Create fleet organization error:", error);
        return NextResponse.json({ error: "Failed to create organization", details: msg }, { status: 500 });
    }
}
