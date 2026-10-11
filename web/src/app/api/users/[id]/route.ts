import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
};

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const payload = await verifyJWT(req);

        if (!payload || (payload.role !== "SUPER_ADMIN" && payload.role !== "ADMIN")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_CACHE_HEADERS });
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
            return NextResponse.json({ error: "User not found" }, { status: 404, headers: NO_CACHE_HEADERS });
        }

        return NextResponse.json(user, { headers: NO_CACHE_HEADERS });
    } catch (error) {
        console.error("User Fetch Error", error);
        return NextResponse.json({ error: "Failed to fetch user" }, { status: 500, headers: NO_CACHE_HEADERS });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const payload = await verifyJWT(req);

        // ONLY Super Admins can update users
        if (!payload || payload.role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_CACHE_HEADERS });
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
        if (name !== undefined) updateData.name = typeof name === "string" ? name.trim() : name;
        if (phone !== undefined) updateData.phone = typeof phone === "string" ? phone.trim() : phone;
        if (role !== undefined) updateData.role = role;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (preferredPaymentMethod !== undefined) updateData.preferredPaymentMethod = preferredPaymentMethod;

        if (password && typeof password === "string" && password.trim() !== "") {
            updateData.password = await bcrypt.hash(password.trim(), 10);
            updateData.forcePasswordChange = true;
        }

        // Verify user exists and is not a SUPER_ADMIN being demoted without care
        const targetUser = await prisma.user.findUnique({ where: { id } });
        if (!targetUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404, headers: NO_CACHE_HEADERS });
        }

        // Prevent removing Super Admin role from last super admin
        if (targetUser.role === "SUPER_ADMIN" && role && role !== "SUPER_ADMIN") {
            const superAdminCount = await prisma.user.count({ where: { role: "SUPER_ADMIN" } });
            if (superAdminCount <= 1) {
                return NextResponse.json({ error: "Cannot remove the only Super Admin role" }, { status: 400, headers: NO_CACHE_HEADERS });
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
                            vehicleType: vehicleType ? String(vehicleType).trim() : null,
                            vehicleModel: vehicleModel ? String(vehicleModel).trim() : null,
                            vehicleColor: vehicleColor ? String(vehicleColor).trim() : null,
                            licensePlate: licensePlate ? String(licensePlate).trim() : null,
                            driverLicense: driverLicense ? String(driverLicense).trim() : null,
                        },
                        update: {
                            vehicleType: vehicleType !== undefined ? (vehicleType ? String(vehicleType).trim() : null) : undefined,
                            vehicleModel: vehicleModel !== undefined ? (vehicleModel ? String(vehicleModel).trim() : null) : undefined,
                            vehicleColor: vehicleColor !== undefined ? (vehicleColor ? String(vehicleColor).trim() : null) : undefined,
                            licensePlate: licensePlate !== undefined ? (licensePlate ? String(licensePlate).trim() : null) : undefined,
                            driverLicense: driverLicense !== undefined ? (driverLicense ? String(driverLicense).trim() : null) : undefined,
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

        return NextResponse.json(updatedUser, { headers: NO_CACHE_HEADERS });
    } catch (error) {
        console.error("User Update Error", error);
        return NextResponse.json({ error: "Failed to update user in database" }, { status: 500, headers: NO_CACHE_HEADERS });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const payload = await verifyJWT(req);

        // ONLY Super Admins can delete users
        if (!payload || payload.role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_CACHE_HEADERS });
        }

        const userToDelete = await prisma.user.findUnique({ where: { id } });
        if (!userToDelete) {
            return NextResponse.json({ error: "User not found in database" }, { status: 404, headers: NO_CACHE_HEADERS });
        }

        // Prevent deleting a Super Admin
        if (userToDelete.role === "SUPER_ADMIN") {
            return NextResponse.json({ error: "Cannot delete a Super Admin account" }, { status: 403, headers: NO_CACHE_HEADERS });
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

        return NextResponse.json({ 
            success: true, 
            message: `User ${userToDelete.email} successfully deleted from database` 
        }, { headers: NO_CACHE_HEADERS });
    } catch (error) {
        console.error("User Deletion Error", error);
        return NextResponse.json({ error: "Failed to delete user from database" }, { status: 500, headers: NO_CACHE_HEADERS });
    }
}
