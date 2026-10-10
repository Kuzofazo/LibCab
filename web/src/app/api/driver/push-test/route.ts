import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyJWT } from "@/lib/auth";
import { PushNotificationService } from "@/services/pushNotificationService";

export async function POST(req: Request) {
    try {
        const user = await verifyJWT();
        if (!user || user.role !== "DRIVER") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const { customMessage, testToken } = body;

        const driverProfile = await prisma.driverProfile.findUnique({
            where: { userId: user.userId },
        });

        const targetToken = testToken || driverProfile?.pushToken || driverProfile?.fcmToken;

        if (!targetToken) {
            return NextResponse.json({
                error: "No push token found for this driver. Please grant notification permissions and go online first.",
            }, { status: 400 });
        }

        const testTitle = "🚨 AfriCab Driver Test Alert!";
        const testBody = customMessage || "Your device is configured to receive instant ride request notifications with sound and vibration.";

        const isExpo = PushNotificationService.isExpoPushToken(targetToken);

        let deliveryResult;
        if (isExpo) {
            deliveryResult = await PushNotificationService.sendExpoPushBatch([
                {
                    to: targetToken,
                    title: testTitle,
                    body: testBody,
                    data: {
                        type: "TEST_NOTIFICATION",
                        timestamp: new Date().toISOString(),
                        originAddress: "Broad Street, Monrovia",
                        destAddress: "Paynesville Red Light",
                        distanceKm: 3.2,
                        fare: 7.50,
                    },
                    sound: "default",
                    priority: "high",
                    channelId: "ride_requests",
                    badge: 1,
                    ttl: 60,
                },
            ]);
        } else {
            const ok = await PushNotificationService.sendFcmDirect(targetToken, {
                title: testTitle,
                body: testBody,
                data: {
                    type: "TEST_NOTIFICATION",
                    timestamp: new Date().toISOString(),
                },
            });
            deliveryResult = { successCount: ok ? 1 : 0, failureCount: ok ? 0 : 1, invalidTokens: [] };
        }

        return NextResponse.json({
            success: true,
            targetToken,
            tokenType: isExpo ? "EXPO_PUSH" : "NATIVE_FCM",
            result: deliveryResult,
            message: "Push test notification dispatched to device.",
        });
    } catch (error) {
        console.error("Push test error:", error);
        return NextResponse.json({ error: "Failed to send push test notification" }, { status: 500 });
    }
}
