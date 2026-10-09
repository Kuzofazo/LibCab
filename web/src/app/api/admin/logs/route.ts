import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        const payload = await verifyJWT();
        if (!payload || payload.role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const logs = await prisma.dispatcherLog.findMany({
            include: {
                dispatcher: {
                    select: { name: true, email: true, role: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ logs });
    } catch (error) {
        console.error("Fetch logs error:", error);
        return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
    }
}
