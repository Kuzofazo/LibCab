import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";
import bcrypt from "bcryptjs";

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

        // Prepare data for update
        const updateData: any = {
            name,
            phone,
            role,
            isActive,
            preferredPaymentMethod
        };

        if (password && password.trim() !== "") {
            updateData.password = await bcrypt.hash(password, 10);
            updateData.forcePasswordChange = true;
        }

        // 1. Update User
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
                    updates: Object.keys(body),
                    adminId: payload.userId,
                    timestamp: new Date().toISOString()
                })
            }
        });

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

        // Perform deletions and updates in a transaction
        await prisma.$transaction(async (tx) => {
            // 1. Unlink Rides (set riderId to null)
            await tx.ride.updateMany({
                where: { riderId: id },
                data: { riderId: null }
            });

            // 2. Unlink Dispatcher Logs (set dispatcherId to null)
            await tx.dispatcherLog.updateMany({
                where: { dispatcherId: id },
                data: { dispatcherId: null }
            });

            // 3. Delete Reviews
            await tx.review.deleteMany({
                where: { userId: id }
            });

            // 4. Delete Complaints
            await tx.complaint.deleteMany({
                where: { userId: id }
            });

            // 5. Unlink Driver from Rides and Delete Driver Profile
            if (userToDelete.role === "DRIVER") {
                const driverProfile = await tx.driverProfile.findUnique({
                    where: { userId: id }
                });
                
                if (driverProfile) {
                    await tx.ride.updateMany({
                        where: { driverId: driverProfile.id },
                        data: { driverId: null }
                    });
                    
                    await tx.driverProfile.delete({
                        where: { id: driverProfile.id }
                    });
                }
            }

            // 6. Delete User
            await tx.user.delete({
                where: { id }
            });

            // 7. Audit Log
            await tx.dispatcherLog.create({
                data: {
                    dispatcherId: payload.userId,
                    action: "ADMIN_DELETE_USER",
                    details: JSON.stringify({
                        message: `Super Admin deleted user ${userToDelete.email}`,
                        deletedUserId: id,
                        deletedUserRole: userToDelete.role,
                        adminId: payload.userId,
                        timestamp: new Date().toISOString()
                    })
                }
            });
        });

        return NextResponse.json({ success: true, message: "User successfully deleted" });
    } catch (error) {
        console.error("User Deletion Error", error);
        return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
    }
}
