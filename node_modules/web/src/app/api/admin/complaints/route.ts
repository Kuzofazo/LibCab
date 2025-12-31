import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
    try {
        const complaints = await prisma.complaint.findMany({
            orderBy: { createdAt: 'desc' },
            include: { user: true }
        });
        return NextResponse.json(complaints);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch complaints" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const { id, status } = body;

        const complaint = await prisma.complaint.update({
            where: { id },
            data: { status }
        });

        return NextResponse.json(complaint);
    } catch (error) {
        return NextResponse.json({ error: "Failed to update complaint" }, { status: 400 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        await prisma.complaint.delete({
            where: { id }
        });

        return NextResponse.json({ message: "Deleted" });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete complaint" }, { status: 400 });
    }
}
