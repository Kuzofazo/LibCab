import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const companyId = searchParams.get("companyId");

        const geofences = await prisma.geofence.findMany({
            where: {
                ...(companyId && companyId !== "ALL" ? { companyId } : {})
            },
            include: {
                company: { select: { id: true, name: true, code: true } }
            },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json({ geofences });
    } catch (error: any) {
        return NextResponse.json({ error: "Failed to fetch geofences", details: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { companyId, name, description, fenceType = "CIRCLE", coordinates, radiusMeters = 2000, speedLimit = 60 } = body;

        if (!name) {
            return NextResponse.json({ error: "Geofence name is required" }, { status: 400 });
        }

        const geofence = await prisma.geofence.create({
            data: {
                companyId: companyId || null,
                name: name.trim(),
                description: description?.trim() || null,
                fenceType,
                coordinates: typeof coordinates === "string" ? coordinates : JSON.stringify(coordinates || [6.3156, -10.8074]),
                radiusMeters: parseFloat(radiusMeters) || 2000,
                speedLimit: parseFloat(speedLimit) || 60,
                isAlertEnabled: true,
                status: "ACTIVE"
            }
        });

        return NextResponse.json(geofence, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: "Failed to create geofence", details: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "Geofence ID required" }, { status: 400 });

        await prisma.geofence.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: "Failed to delete geofence", details: error.message }, { status: 500 });
    }
}
