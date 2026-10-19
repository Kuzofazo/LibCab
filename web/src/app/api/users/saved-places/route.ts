import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        const user = await verifyJWT(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const savedPlaces = await prisma.savedPlace.findMany({
            where: { userId: user.userId },
            orderBy: { createdAt: "asc" }
        });

        return NextResponse.json(savedPlaces);
    } catch (error) {
        console.error("GET saved places error:", error);
        return NextResponse.json({ error: "Failed to fetch saved places" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await verifyJWT(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { label, address, lat, lng, icon } = body;

        if (!label || !address) {
            return NextResponse.json({ error: "Label and address are required" }, { status: 400 });
        }

        // Limit user to 10 saved places
        const count = await prisma.savedPlace.count({ where: { userId: user.userId } });
        if (count >= 10) {
            return NextResponse.json({ error: "Maximum of 10 saved places allowed." }, { status: 400 });
        }

        let chosenIcon = icon || "map-pin";
        const lowerLabel = label.toLowerCase().trim();
        if (lowerLabel.includes("home")) chosenIcon = "home";
        else if (lowerLabel.includes("work") || lowerLabel.includes("office")) chosenIcon = "briefcase";
        else if (lowerLabel.includes("school") || lowerLabel.includes("uni")) chosenIcon = "graduation-cap";
        else if (lowerLabel.includes("family") || lowerLabel.includes("mom") || lowerLabel.includes("dad")) chosenIcon = "heart";

        const savedPlace = await prisma.savedPlace.create({
            data: {
                userId: user.userId,
                label: label.trim(),
                address: address.trim(),
                lat: lat !== undefined ? parseFloat(lat) : 6.3156,
                lng: lng !== undefined ? parseFloat(lng) : -10.8074,
                icon: chosenIcon,
            }
        });

        return NextResponse.json(savedPlace, { status: 201 });
    } catch (error: any) {
        console.error("POST saved place error:", error);
        return NextResponse.json({ error: error.message || "Failed to create saved place" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const user = await verifyJWT(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { id, label, address, lat, lng, icon } = body;

        if (!id) {
            return NextResponse.json({ error: "Saved place ID is required" }, { status: 400 });
        }

        // Ensure place belongs to current user
        const existing = await prisma.savedPlace.findUnique({ where: { id } });
        if (!existing || existing.userId !== user.userId) {
            return NextResponse.json({ error: "Saved place not found or unauthorized" }, { status: 404 });
        }

        const updateData: any = {};
        if (label) updateData.label = label.trim();
        if (address) updateData.address = address.trim();
        if (lat !== undefined) updateData.lat = parseFloat(lat);
        if (lng !== undefined) updateData.lng = parseFloat(lng);
        if (icon) updateData.icon = icon;

        const updated = await prisma.savedPlace.update({
            where: { id },
            data: updateData
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error("PATCH saved place error:", error);
        return NextResponse.json({ error: error.message || "Failed to update saved place" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const user = await verifyJWT(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Saved place ID is required" }, { status: 400 });
        }

        const existing = await prisma.savedPlace.findUnique({ where: { id } });
        if (!existing || existing.userId !== user.userId) {
            return NextResponse.json({ error: "Saved place not found or unauthorized" }, { status: 404 });
        }

        await prisma.savedPlace.delete({ where: { id } });

        return NextResponse.json({ message: "Saved place deleted successfully" });
    } catch (error: any) {
        console.error("DELETE saved place error:", error);
        return NextResponse.json({ error: error.message || "Failed to delete saved place" }, { status: 500 });
    }
}
