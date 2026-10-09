import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { verifyJWT } from "@/lib/auth";
import { memoryCache } from "@/lib/cache";

const USERS_CACHE_KEY = "admin_users_list";

export async function GET() {
    try {
        const payload = await verifyJWT();
        if (!payload || (payload.role !== "SUPER_ADMIN" && payload.role !== "ADMIN")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const cached = memoryCache.get<object[]>(USERS_CACHE_KEY);
        if (cached) return NextResponse.json(cached);

        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                role: true,
                isActive: true,
                preferredPaymentMethod: true,
                createdAt: true,
                updatedAt: true,
                driverProfile: {
                    select: {
                        id: true,
                        userId: true,
                        vehicleType: true,
                        vehicleModel: true,
                        vehicleColor: true,
                        licensePlate: true,
                        driverLicense: true,
                        isOnline: true,
                        rating: true
                    }
                }
            }
        });

        memoryCache.set(USERS_CACHE_KEY, users, 30);
        return NextResponse.json(users);
    } catch (error) {
        console.error("Fetch Users Error:", error);
        return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        // 1. Permission Check
        const payload = await verifyJWT();
        if (!payload || payload.role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { 
            email, 
            password, 
            name, 
            role, 
            phone, 
            preferredPaymentMethod,
            // Driver Specific
            vehicleType,
            vehicleModel,
            vehicleColor,
            licensePlate,
            driverLicense,
            isActive = true
        } = body;

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        const existingEmail = await prisma.user.findUnique({ where: { email } });
        if (existingEmail) {
            return NextResponse.json({ error: "Email already exists" }, { status: 400 });
        }

        if (phone) {
            const existingPhone = await prisma.user.findFirst({ where: { phone } });
            if (existingPhone) {
                return NextResponse.json({ error: "Phone number already in use" }, { status: 400 });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // 2. Create User
        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                phone,
                role: role || "RIDER",
                preferredPaymentMethod,
                isActive,
                forcePasswordChange: true,
                driverProfile: role === "DRIVER" ? {
                    create: {
                        vehicleType,
                        vehicleModel,
                        vehicleColor,
                        licensePlate,
                        driverLicense,
                    }
                } : undefined
            },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                role: true,
                isActive: true,
                preferredPaymentMethod: true,
                createdAt: true,
                driverProfile: true
            }
        });

        // 3. Audit Log
        await prisma.dispatcherLog.create({
            data: {
                dispatcherId: payload.userId,
                action: "ADMIN_CREATE_USER",
                details: JSON.stringify({
                    message: `Super Admin created a new ${newUser.role}`,
                    targetUserId: newUser.id,
                    targetRole: newUser.role,
                    targetEmail: newUser.email,
                    targetName: newUser.name,
                    adminId: payload.userId,
                    timestamp: new Date().toISOString()
                })
            }
        });

        memoryCache.invalidate(USERS_CACHE_KEY);
        return NextResponse.json(newUser);
    } catch (error) {
        console.error("User Create Error", error);
        return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }
}
