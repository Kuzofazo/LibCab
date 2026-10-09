import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { verifyJWT } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        const payload = await verifyJWT();
        if (!payload || payload.role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const admins = await prisma.user.findMany({
            where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                isActive: true,
                createdAt: true,
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ admins });
    } catch (error) {
        console.error("Fetch admins error:", error);
        return NextResponse.json({ error: "Failed to fetch admins" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const payload = await verifyJWT();
        if (!payload || payload.role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { name, email, phone, password, role } = body;

        if (!name || !email || !password) {
            return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return NextResponse.json({ error: "Email already exists" }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newAdmin = await prisma.user.create({
            data: {
                name,
                email,
                phone,
                password: hashedPassword,
                role: role || "ADMIN",
                forcePasswordChange: true,
                isActive: true,
            },
            select: { id: true, name: true, email: true, role: true },
        });

        return NextResponse.json({ message: "Admin created successfully", admin: newAdmin });
    } catch (error) {
        console.error("Create admin error:", error);
        return NextResponse.json({ error: "Failed to create admin" }, { status: 500 });
    }
}
