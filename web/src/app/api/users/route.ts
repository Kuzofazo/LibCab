import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { verifyJWT } from "@/lib/auth";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
};

export async function GET(req: Request) {
    try {
        const payload = await verifyJWT(req);
        if (!payload || (payload.role !== "SUPER_ADMIN" && payload.role !== "ADMIN")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_CACHE_HEADERS });
        }

        // Always query database directly for 100% real-time synchronization
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

        return NextResponse.json(users, { headers: NO_CACHE_HEADERS });
    } catch (error) {
        console.error("Fetch Users Error:", error);
        return NextResponse.json({ error: "Failed to fetch users from database" }, { status: 500, headers: NO_CACHE_HEADERS });
    }
}

export async function POST(req: Request) {
    try {
        // 1. Permission Check
        const payload = await verifyJWT(req);
        if (!payload || (payload.role !== "SUPER_ADMIN" && payload.role !== "ADMIN")) {
            return NextResponse.json({ error: "Unauthorized: Administrator permissions required." }, { status: 401, headers: NO_CACHE_HEADERS });
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

        if (!email || typeof email !== "string" || !password || typeof password !== "string") {
            return NextResponse.json({ error: "Email address and password are required." }, { status: 400, headers: NO_CACHE_HEADERS });
        }

        const cleanEmail = email.trim().toLowerCase();
        const cleanPhone = phone && typeof phone === "string" && phone.trim() !== "" ? phone.trim() : null;
        const cleanName = name && typeof name === "string" ? name.trim() : null;

        // Duplicate checks
        const existingEmail = await prisma.user.findUnique({ where: { email: cleanEmail } });
        if (existingEmail) {
            return NextResponse.json({ 
                error: `Account with email "${cleanEmail}" already exists in database.` 
            }, { status: 400, headers: NO_CACHE_HEADERS });
        }

        if (cleanPhone) {
            const existingPhone = await prisma.user.findFirst({ where: { phone: cleanPhone } });
            if (existingPhone) {
                return NextResponse.json({ 
                    error: `Phone number "${cleanPhone}" is already in use by another account.` 
                }, { status: 400, headers: NO_CACHE_HEADERS });
            }
        }

        const hashedPassword = await bcrypt.hash(password.trim(), 10);

        // 2. Create User and Driver Profile synchronously in DB
        const newUser = await prisma.user.create({
            data: {
                name: cleanName,
                email: cleanEmail,
                password: hashedPassword,
                phone: cleanPhone,
                role: role || "RIDER",
                preferredPaymentMethod: preferredPaymentMethod || "MOBILE_MONEY",
                isActive: isActive ?? true,
                forcePasswordChange: true,
                driverProfile: role === "DRIVER" ? {
                    create: {
                        vehicleType: vehicleType ? String(vehicleType).trim() : null,
                        vehicleModel: vehicleModel ? String(vehicleModel).trim() : null,
                        vehicleColor: vehicleColor ? String(vehicleColor).trim() : null,
                        licensePlate: licensePlate ? String(licensePlate).trim() : null,
                        driverLicense: driverLicense ? String(driverLicense).trim() : null,
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

        // 3. Audit Log
        await prisma.dispatcherLog.create({
            data: {
                dispatcherId: payload.userId,
                action: "ADMIN_CREATE_USER",
                details: JSON.stringify({
                    message: `Administrator created user ${newUser.email} (${newUser.role})`,
                    targetUserId: newUser.id,
                    targetRole: newUser.role,
                    targetEmail: newUser.email,
                    targetName: newUser.name,
                    adminId: payload.userId,
                    timestamp: new Date().toISOString()
                })
            }
        });

        return NextResponse.json(newUser, { status: 201, headers: NO_CACHE_HEADERS });
    } catch (error: any) {
        console.error("User Create Error:", error);
        return NextResponse.json({ 
            error: error?.message || "Failed to create account in database" 
        }, { status: 500, headers: NO_CACHE_HEADERS });
    }
}
