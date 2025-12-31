import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
    try {
        const { email, password, name, role } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json({ error: "User already exists" }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: role || "RIDER",
            },
        });

        // If driver, create profile
        if (role === "DRIVER") {
            await prisma.driverProfile.create({
                data: {
                    userId: user.id,
                },
            });
        }

        return NextResponse.json({
            message: "User created successfully",
            user: { id: user.id, email: user.email, role: user.role },
        });
    } catch (error) {
        console.error("Signup error:", error);
        return NextResponse.json({ error: "Registration failed" }, { status: 500 });
    }
}
