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

        // If driver, create profile with PENDING approval status and capture vehicle details
        let driverProfileRecord = null;
        if (role === "DRIVER") {
            const { ensureDriverApprovalSchema } = await import("@/lib/driverApprovalDb");
            await ensureDriverApprovalSchema();

            driverProfileRecord = await prisma.driverProfile.create({
                data: {
                    userId: user.id,
                    vehicleType: vehicleType || null,
                    vehicleModel: vehicleModel || null,
                    vehicleColor: vehicleColor || null,
                    licensePlate: licensePlate || null,
                    driverLicense: driverLicense || null,
                    approvalStatus: "PENDING",
                    isOnline: false,
                },
            });

            // Invalidate admin driver cache so new signup immediately appears
            try {
                const { memoryCache } = await import("@/lib/cache");
                memoryCache.delete("admin_drivers_list");
            } catch {}

            // Broadcast real-time event to Admin Dashboard
            try {
                const { rideStreamManager } = await import("@/lib/sse");
                rideStreamManager.publish({
                    type: "NEW_DRIVER_SIGNUP",
                    driverId: driverProfileRecord.id,
                    data: {
                        userId: user.id,
                        driverProfileId: driverProfileRecord.id,
                        name: user.name,
                        email: user.email,
                        phone: user.phone,
                        vehicleType: driverProfileRecord.vehicleType,
                        vehicleModel: driverProfileRecord.vehicleModel,
                        vehicleColor: driverProfileRecord.vehicleColor,
                        licensePlate: driverProfileRecord.licensePlate,
                        driverLicense: driverProfileRecord.driverLicense,
                        approvalStatus: "PENDING",
                        createdAt: user.createdAt,
                    },
                    timestamp: new Date().toISOString(),
                });
            } catch {}
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role, forcePasswordChange: user.forcePasswordChange },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        return NextResponse.json({
            message: "User created successfully",
            token,
            user: { 
                id: user.id, 
                email: user.email, 
                name: user.name, 
                role: user.role,
                driverProfileId: driverProfileRecord?.id,
                approvalStatus: driverProfileRecord?.approvalStatus || (role === "DRIVER" ? "PENDING" : null),
            },
        });
    } catch (error) {
        console.error("Signup error:", error);
        return NextResponse.json({ error: "Registration failed" }, { status: 500 });
    }
}
