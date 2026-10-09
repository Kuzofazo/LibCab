import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "africab_super_secret_key_123";

export async function POST(req: Request) {
    try {
        const { email, password, name, phone, role, vehicleType, vehicleModel, vehicleColor, licensePlate, driverLicense } = await req.json();

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
                phone,
                password: hashedPassword,
                name,
                role: role || "RIDER",
            },
        });

        // If driver, create profile and capture dynamic vehicle details
        if (role === "DRIVER") {
            await prisma.driverProfile.create({
                data: {
                    userId: user.id,
                    vehicleType: vehicleType,
                    vehicleModel: vehicleModel,
                    vehicleColor: vehicleColor,
                    licensePlate: licensePlate,
                    driverLicense: driverLicense
                },
            });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role, forcePasswordChange: user.forcePasswordChange },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        return NextResponse.json({
            message: "User created successfully",
            token,
            user: { id: user.id, email: user.email, name: user.name, role: user.role },
        });
    } catch (error) {
        console.error("Signup error:", error);
        return NextResponse.json({ error: "Registration failed" }, { status: 500 });
    }
}
