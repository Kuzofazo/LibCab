import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET() {
    try {
        // Fallback to raw query because 'prisma.zone' might not be generated yet in the runtime
        // checking if prisma.zone exists, otherwise use raw
        if ((prisma as any).zone) {
            const zones = await (prisma as any).zone.findMany({
                orderBy: { createdAt: 'desc' }
            });
            return NextResponse.json(zones);
        }

        // Raw query fallback
        // Note: Table name typically matches model name "Zone" in quotes for Postgres
        const zones = await prisma.$queryRaw`SELECT * FROM "Zone" ORDER BY "createdAt" DESC`;
        // Convert BigInts/Dates if necessary, but usually ok for JSON stringify if simple
        return NextResponse.json(zones);
    } catch (error) {
        console.error("GET Zone Error:", error);
        return NextResponse.json({ error: "Failed to fetch zones" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, city, baseFare, multiplier } = body;

        if (!name || !city) {
            return NextResponse.json({ error: "Name and city are required" }, { status: 400 });
        }

        const id = `Z-${Math.floor(Math.random() * 10000)}`;
        const now = new Date();

        if ((prisma as any).zone) {
            const zone = await (prisma as any).zone.create({
                data: {
                    name,
                    city,
                    baseFare: parseFloat(baseFare),
                    multiplier: parseFloat(multiplier),
                    status: "ACTIVE"
                }
            });
            return NextResponse.json(zone);
        }

        // Raw Insert
        await prisma.$executeRaw`
            INSERT INTO "Zone" ("id", "name", "city", "baseFare", "multiplier", "status", "createdAt", "updatedAt")
            VALUES (${id}, ${name}, ${city}, ${parseFloat(baseFare)}, ${parseFloat(multiplier)}, 'ACTIVE', ${now}, ${now})
        `;

        // Return the object we just made
        return NextResponse.json({
            id, name, city, baseFare: parseFloat(baseFare), multiplier: parseFloat(multiplier), status: "ACTIVE", createdAt: now, updatedAt: now
        });

    } catch (error) {
        console.error("POST Zone Error:", error);
        return NextResponse.json({ error: "Failed to create zone" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        if ((prisma as any).zone) {
            await (prisma as any).zone.delete({ where: { id } });
        } else {
            await prisma.$executeRaw`DELETE FROM "Zone" WHERE "id" = ${id}`;
        }

        return NextResponse.json({ message: "Deleted" });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete zone" }, { status: 500 });
    }
}
