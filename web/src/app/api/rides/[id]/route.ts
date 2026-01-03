import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const id = params.id;

        if (!id) {
            return NextResponse.json({ error: "Ride ID is required" }, { status: 400 });
        }

        const ride = await prisma.ride.findUnique({
            where: { id },
            include: {
                rider: { select: { name: true, phone: true } },
                driver: {
                    include: {
                        user: { select: { name: true, phone: true } } // Get driver name and phone
                    }
                },
            },
        });

        if (!ride) {
            return NextResponse.json({ error: "Ride not found" }, { status: 404 });
        }

        return NextResponse.json(ride);
    } catch (error) {
        console.error("Fetch ride error:", error);
        return NextResponse.json({ error: "Failed to fetch ride" }, { status: 500 });
    }
}
