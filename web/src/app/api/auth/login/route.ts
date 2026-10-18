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
        let driverApprovalStatus = user.driverProfile?.approvalStatus || "APPROVED";
        let driverRejectionReason = user.driverProfile?.rejectionReason || null;

        if (user.role === "DRIVER") {
            const { ensureDriverApprovalSchema } = await import("@/lib/driverApprovalDb");
            await ensureDriverApprovalSchema();

            if (!user.driverProfile) {
                const newProfile = await prisma.driverProfile.create({
                    data: {
                        userId: user.id,
                        isOnline: false,
                        approvalStatus: "PENDING",
                        vehicleType: "Car",
                        vehicleModel: "Toyota Sedan",
                        licensePlate: "LB-CAB-101",
                    }
                });
                driverProfileId = newProfile.id;
                driverApprovalStatus = "PENDING";
            } else {
                driverApprovalStatus = user.driverProfile.approvalStatus || "APPROVED";
                driverRejectionReason = user.driverProfile.rejectionReason || null;

                // Only set online if already approved
                if (driverApprovalStatus === "APPROVED" && !user.driverProfile.isOnline) {
                    await prisma.driverProfile.update({
                        where: { id: user.driverProfile.id },
                        data: { isOnline: true },
                    });
                } else if (driverApprovalStatus !== "APPROVED" && user.driverProfile.isOnline) {
                    // Force offline if not approved
                    await prisma.driverProfile.update({
                        where: { id: user.driverProfile.id },
                        data: { isOnline: false },
                    });
                }
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
                approvalStatus: user.role === "DRIVER" ? driverApprovalStatus : undefined,
                rejectionReason: user.role === "DRIVER" ? driverRejectionReason : undefined,
                forcePasswordChange: user.forcePasswordChange
            },
        });
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json({ error: "Login failed" }, { status: 500 });
    }
}
