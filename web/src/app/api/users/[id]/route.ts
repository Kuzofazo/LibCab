import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";
import { memoryCache } from "@/lib/cache";
import bcrypt from "bcryptjs";

const USERS_CACHE_KEY = "admin_users_list";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const payload = await verifyJWT();

        if (!payload || (payload.role !== "SUPER_ADMIN" && payload.role !== "ADMIN")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id },
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

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error("User Fetch Error", error);
        return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const payload = await verifyJWT();

        // ONLY Super Admins can update users
        if (!payload || payload.role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { 
            name, 
            phone, 
            role, 
            isActive, 
            preferredPaymentMethod,
            // Driver Profile fields
            vehicleType,
            vehicleModel,
            vehicleColor,
            licensePlate,
            driverLicense,
            password
        } = body;

        // Prepare data for update (only include defined fields)
        const updateData: Record<string, unknown> = {};
        if (name !== undefined) updateData.name = name;
        if (phone !== undefined) updateData.phone = phone;
        if (role !== undefined) updateData.role = role;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (preferredPaymentMethod !== undefined) updateData.preferredPaymentMethod = preferredPaymentMethod;

        if (password && password.trim() !== "") {
            updateData.password = await bcrypt.hash(password, 10);
            updateData.forcePasswordChange = true;
        }

        // Verify user exists and is not a SUPER_ADMIN being demoted without care
        const targetUser = await prisma.user.findUnique({ where: { id } });
        if (!targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Prevent removing Super Admin role from last super admin
        if (targetUser.role === "SUPER_ADMIN" && role && role !== "SUPER_ADMIN") {
            const superAdminCount = await prisma.user.count({ where: { role: "SUPER_ADMIN" } });
            if (superAdminCount <= 1) {
                return NextResponse.json({ error: "Cannot remove the only Super Admin role" }, { status: 400 });
            }
        }

        // 1. Check existing driver profile
        const existingProfile = await prisma.driverProfile.findUnique({ where: { userId: id } });

        const updatedUser = await prisma.user.update({
            where: { id },
            data: {
                ...updateData,
                driverProfile: role === "DRIVER" ? {
                    upsert: {
                        create: {
                            vehicleType,
                            vehicleModel,
                            vehicleColor,
                            licensePlate,
                            driverLicense,
                        },
                        update: {
                            vehicleType,
                            vehicleModel,
                            vehicleColor,
                            licensePlate,
                            driverLicense,
                        }
                    }
                } : (role === "RIDER" && existingProfile ? { delete: true } : undefined)
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

        // 2. Audit Log
        await prisma.dispatcherLog.create({
            data: {
                dispatcherId: payload.userId,
                action: "ADMIN_UPDATE_USER",
                details: JSON.stringify({
                    message: `Super Admin updated user ${updatedUser.email}`,
                    targetUserId: id,
                    updates: Object.keys(body).filter(k => k !== 'password'),
                    adminId: payload.userId,
                    timestamp: new Date().toISOString()
                })
            }
        });

        memoryCache.invalidate(USERS_CACHE_KEY);
        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error("User Update Error", error);
        return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const payload = await verifyJWT();

        // ONLY Super Admins can delete users
        if (!payload || payload.role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userToDelete = await prisma.user.findUnique({ where: { id } });
        if (!userToDelete) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Prevent deleting a Super Admin
        if (userToDelete.role === "SUPER_ADMIN") {
            return NextResponse.json({ error: "Cannot delete a Super Admin account" }, { status: 403 });
        }

        // Run sequential deletions (avoid long transactions timing out on Supabase)

        // 1. Handle driver profile relations
        const driverProfile = await prisma.driverProfile.findUnique({ where: { userId: id } });

        if (driverProfile) {
            // Unlink ride offers
            await prisma.rideOffer.deleteMany({ where: { driverId: driverProfile.id } });
            // Unlink location logs
            await prisma.locationLog.deleteMany({ where: { driverId: driverProfile.id } });
            // Unlink rides assigned to driver
            await prisma.ride.updateMany({ where: { driverId: driverProfile.id }, data: { driverId: null } });
            // Delete driver profile
            await prisma.driverProfile.delete({ where: { id: driverProfile.id } });
        }

        // 2. Unlink rides where this user is a rider
        await prisma.ride.updateMany({ where: { riderId: id }, data: { riderId: null } });

        // 3. Delete reviews
        await prisma.review.deleteMany({ where: { userId: id } });

        // 4. Delete complaints
        await prisma.complaint.deleteMany({ where: { userId: id } });

        // 5. Unlink dispatcher logs
        await prisma.dispatcherLog.updateMany({ where: { dispatcherId: id }, data: { dispatcherId: null } });

        // 6. Delete User
        await prisma.user.delete({ where: { id } });

        // 7. Audit Log
        await prisma.dispatcherLog.create({
            data: {
                dispatcherId: payload.userId,
                action: "ADMIN_DELETE_USER",
                details: JSON.stringify({
                    message: `Super Admin deleted user ${userToDelete.email}`,
                    deletedUserId: id,
                    deletedUserRole: userToDelete.role,
                    deletedUserEmail: userToDelete.email,
                    adminId: payload.userId,
                    timestamp: new Date().toISOString()
                })
            }
        });

        // Invalidate cache so next fetch is fresh
        memoryCache.invalidate(USERS_CACHE_KEY);

        return NextResponse.json({ success: true, message: `User ${userToDelete.email} successfully deleted` });
    } catch (error) {
        console.error("User Deletion Error", error);
        return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
    }
}
