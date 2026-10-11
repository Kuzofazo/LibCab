import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "africab_super_secret_key_123";

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email },
            include: { driverProfile: true },
        });

        if (!user || !user.isActive) {
            return NextResponse.json({ error: "Account deactivated or not found" }, { status: 401 });
        }

        if (!user.password || !(await bcrypt.compare(password, user.password))) {
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        let driverProfileId = user.driverProfile?.id;
        if (user.role === "DRIVER") {
            if (!user.driverProfile) {
                const newProfile = await prisma.driverProfile.create({
                    data: {
                        userId: user.id,
                        isOnline: true,
                        vehicleType: "Car",
                        vehicleModel: "Toyota Sedan",
                        licensePlate: "LB-CAB-101",
                    }
                });
                driverProfileId = newProfile.id;
            } else if (!user.driverProfile.isOnline) {
                await prisma.driverProfile.update({
                    where: { id: user.driverProfile.id },
                    data: { isOnline: true },
                });
            }
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role, forcePasswordChange: user.forcePasswordChange },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
            await prisma.dispatcherLog.create({
                data: {
                    dispatcherId: user.id,
                    action: "LOGIN",
                    details: `Admin ${user.email} logged into the system.`
                }
            });
        }

        return NextResponse.json({
            message: "Login successful",
            token,
            user: { 
                id: user.id, 
                email: user.email, 
                name: user.name, 
                role: user.role,
                driverProfileId: driverProfileId || undefined,
                forcePasswordChange: user.forcePasswordChange
            },
        });
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json({ error: "Login failed" }, { status: 500 });
    }
}
