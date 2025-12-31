import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
    try {
        const announcements = await prisma.announcement.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(announcements);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch announcements" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { title, content, type, target } = body;

        const announcement = await prisma.announcement.create({
            data: {
                title,
                content,
                type: type || "UPDATE",
                target: target || "ALL",
            }
        });

        return NextResponse.json(announcement);
    } catch (error) {
        return NextResponse.json({ error: "Failed to create announcement" }, { status: 400 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        await prisma.announcement.delete({
            where: { id }
        });

        return NextResponse.json({ message: "Deleted" });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete announcement" }, { status: 400 });
    }
}
