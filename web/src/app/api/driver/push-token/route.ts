import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        const user = await verifyJWT();
        if (!user || user.role !== "DRIVER") {
            return NextResponse.json({ error: "Unauthorized. Driver role required." }, { status: 401 });
        }

        const body = await req.json();
        const {
            pushToken,
            fcmToken,
            platform = "android",
            soundEnabled = true,
            vibrationEnabled = true,
            maxDispatchRadiusKm = 12.0,
        } = body;

        if (!pushToken && !fcmToken) {
            return NextResponse.json({ error: "pushToken or fcmToken is required." }, { status: 400 });
        }

        // Find or verify driver profile
        let driverProfile = await prisma.driverProfile.findUnique({
            where: { userId: user.userId },
        });

        if (!driverProfile) {
            // Auto-provision if user is driver role
            driverProfile = await prisma.driverProfile.create({
                data: {
                    userId: user.userId,
                    vehicleType: "Car",
                    isOnline: true,
                },
            });
        }

        const updatedProfile = await prisma.driverProfile.update({
            where: { id: driverProfile.id },
            data: {
                ...(pushToken ? { pushToken } : {}),
                ...(fcmToken ? { fcmToken } : {}),
                devicePlatform: platform.toLowerCase(),
                pushNotificationEnabled: true,
                soundEnabled: Boolean(soundEnabled),
                vibrationEnabled: Boolean(vibrationEnabled),
                maxDispatchRadiusKm: parseFloat(maxDispatchRadiusKm) || 12.0,
                lastPing: new Date(),
            },
            select: {
                id: true,
                userId: true,
                pushToken: true,
                fcmToken: true,
                devicePlatform: true,
                isOnline: true,
                soundEnabled: true,
                vibrationEnabled: true,
                maxDispatchRadiusKm: true,
            },
        });

        return NextResponse.json({
            success: true,
            message: "Push notification token registered successfully.",
            profile: updatedProfile,
        });
    } catch (error) {
        console.error("Push token registration error:", error);
        return NextResponse.json({ error: "Failed to register push token" }, { status: 500 });
    }
}
