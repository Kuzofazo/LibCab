import { prisma } from "@/lib/db";

export interface PushNotificationPayload {
    to: string; // Expo push token or FCM token
    title: string;
    body: string;
    data?: Record<string, unknown>;
    sound?: string;
    priority?: "default" | "normal" | "high";
    channelId?: string;
    badge?: number;
    ttl?: number; // Time-to-live in seconds
    subtitle?: string;
}

export interface RidePushDetails {
    rideId: string;
    originAddress: string;
    destAddress: string;
    originLat: number;
    originLng: number;
    destLat: number;
    destLng: number;
    distanceKm: number;
    etaMinutes: number;
    fare: number;
    vehicleType?: string;
    rideCategory?: string;
    expiresAt: string;
}

export class PushNotificationService {
    // In-memory cache to prevent duplicate push notifications for the same ride & driver within 60s
    private static sentNotifications = new Map<string, number>();

    /**
     * Clean up expired idempotency keys (older than 3 minutes)
     */
    private static cleanupSentCache() {
        const now = Date.now();
        for (const [key, timestamp] of this.sentNotifications.entries()) {
            if (now - timestamp > 180000) {
                this.sentNotifications.delete(key);
            }
        }
    }

    /**
     * Validate if string is an Expo Push Token
     */
    public static isExpoPushToken(token: string): boolean {
        return (
            typeof token === "string" &&
            (token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken["))
        );
    }

    /**
     * Send batch notifications via Expo Push API
     * Handles both Android (FCM) and iOS (APNs) with optimal battery & background wake settings
     */
    public static async sendExpoPushBatch(messages: PushNotificationPayload[]): Promise<{
        successCount: number;
        failureCount: number;
        invalidTokens: string[];
    }> {
        if (!messages.length) {
            return { successCount: 0, failureCount: 0, invalidTokens: [] };
        }

        const invalidTokens: string[] = [];
        let successCount = 0;
        let failureCount = 0;

        // Expo allows max 100 messages per chunk
        const chunkSize = 100;
        for (let i = 0; i < messages.length; i += chunkSize) {
            const chunk = messages.slice(i, i + chunkSize);

            try {
                const response = await fetch("https://exp.host/--/api/v2/push/send", {
                    method: "POST",
                    headers: {
                        "Accept": "application/json",
                        "Accept-Encoding": "gzip, deflate",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(chunk),
                });

                if (!response.ok) {
                    console.error("Expo Push HTTP Error:", response.status, await response.text());
                    failureCount += chunk.length;
                    continue;
                }

                const result = await response.json();
                const receipts = result.data || [];

                for (let j = 0; j < receipts.length; j++) {
                    const ticket = receipts[j];
                    const originalMsg = chunk[j];

                    if (ticket.status === "ok") {
                        successCount++;
                    } else {
                        failureCount++;
                        console.warn("Expo Push Ticket Error:", ticket.message, ticket.details);

                        // If token is invalid or device is unregistered, flag for pruning
                        if (
                            ticket.details?.error === "DeviceNotRegistered" ||
                            ticket.details?.error === "InvalidCredentials"
                        ) {
                            if (originalMsg.to) {
                                invalidTokens.push(originalMsg.to);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to send Expo push chunk:", err);
                failureCount += chunk.length;
            }
        }

        // Clean up invalid tokens from database asynchronously
        if (invalidTokens.length > 0) {
            this.pruneInvalidTokens(invalidTokens).catch((err) =>
                console.error("Failed to prune invalid tokens:", err)
            );
        }

        return { successCount, failureCount, invalidTokens };
    }

    /**
     * Send direct FCM message if FCM Server Key is configured in environment
     */
    public static async sendFcmDirect(
        fcmToken: string,
        payload: {
            title: string;
            body: string;
            data: Record<string, unknown>;
        }
    ): Promise<boolean> {
        const fcmServerKey = process.env.FCM_SERVER_KEY;
        if (!fcmServerKey) return false;

        try {
            const res = await fetch("https://fcm.googleapis.com/fcm/send", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `key=${fcmServerKey}`,
                },
                body: JSON.stringify({
                    to: fcmToken,
                    priority: "high",
                    notification: {
                        title: payload.title,
                        body: payload.body,
                        sound: "default",
                        android_channel_id: "ride_requests",
                        click_action: "AFRICAB_RIDE_REQUEST",
                    },
                    data: payload.data,
                    time_to_live: 60, // 60 seconds
                }),
            });

            return res.ok;
        } catch (err) {
            console.error("Direct FCM send error:", err);
            return false;
        }
    }

    /**
     * Remove or clear invalid push tokens from DriverProfile
     */
    private static async pruneInvalidTokens(tokens: string[]) {
        try {
            await prisma.driverProfile.updateMany({
                where: {
                    pushToken: { in: tokens },
                },
                data: {
                    pushToken: null,
                },
            });
            console.log(`Pruned ${tokens.length} invalid push tokens from database.`);
        } catch (err) {
            console.error("Error during token pruning:", err);
        }
    }

    /**
     * Dispatch high-priority Ride Request push notification to multiple drivers
     */
    public static async notifyDriversOfRideRequest(
        drivers: Array<{
            id: string;
            pushToken?: string | null;
            fcmToken?: string | null;
            soundEnabled?: boolean;
            vibrationEnabled?: boolean;
        }>,
        rideDetails: RidePushDetails
    ): Promise<{ sent: number; skipped: number }> {
        this.cleanupSentCache();

        const expoMessages: PushNotificationPayload[] = [];
        let sentCount = 0;
        let skippedCount = 0;

        for (const driver of drivers) {
            const idempotencyKey = `ride_${rideDetails.rideId}_driver_${driver.id}`;

            // Skip duplicate within short window
            if (this.sentNotifications.has(idempotencyKey)) {
                skippedCount++;
                continue;
            }

            const token = driver.pushToken || driver.fcmToken;
            if (!token) {
                skippedCount++;
                continue;
            }

            this.sentNotifications.set(idempotencyKey, Date.now());

            // Build rich high-priority payload for locked screen & background delivery
            const formattedFare = `$${Number(rideDetails.fare || 0).toFixed(2)}`;
            const title = "🚖 New Ride Request Available!";
            const body = `Pickup: ${rideDetails.originAddress} (${rideDetails.distanceKm} km away) • Fare: ${formattedFare}`;

            const dataPayload = {
                type: "RIDE_REQUEST",
                rideId: rideDetails.rideId,
                originAddress: rideDetails.originAddress,
                destAddress: rideDetails.destAddress,
                originLat: rideDetails.originLat,
                originLng: rideDetails.originLng,
                destLat: rideDetails.destLat,
                destLng: rideDetails.destLng,
                distanceKm: rideDetails.distanceKm,
                etaMinutes: rideDetails.etaMinutes,
                fare: rideDetails.fare,
                vehicleType: rideDetails.vehicleType || "Car",
                rideCategory: rideDetails.rideCategory || "Regular",
                expiresAt: rideDetails.expiresAt,
                soundEnabled: driver.soundEnabled !== false,
                vibrationEnabled: driver.vibrationEnabled !== false,
            };

            if (this.isExpoPushToken(token)) {
                expoMessages.push({
                    to: token,
                    title,
                    body,
                    data: dataPayload,
                    sound: driver.soundEnabled !== false ? "default" : undefined,
                    priority: "high",
                    channelId: "ride_requests",
                    badge: 1,
                    ttl: 60, // Expire notification if device offline for > 1 min
                });
            } else if (process.env.FCM_SERVER_KEY && driver.fcmToken) {
                // Direct FCM fallback
                this.sendFcmDirect(driver.fcmToken, {
                    title,
                    body,
                    data: dataPayload,
                }).catch(() => {});
                sentCount++;
            }
        }

        if (expoMessages.length > 0) {
            const res = await this.sendExpoPushBatch(expoMessages);
            sentCount += res.successCount;
        }

        return { sent: sentCount, skipped: skippedCount };
    }

    /**
     * Notify drivers who received an offer that the ride was already taken by someone else
     * (Allows mobile app to dismiss the incoming offer modal and cancel background notification)
     */
    public static async notifyDriversOfRideTaken(
        driverTokens: string[],
        rideId: string
    ): Promise<void> {
        if (!driverTokens.length) return;

        const messages: PushNotificationPayload[] = driverTokens
            .filter((t) => this.isExpoPushToken(t))
            .map((to) => ({
                to,
                title: "Ride Unavailable",
                body: "This ride was accepted by another driver.",
                data: {
                    type: "RIDE_TAKEN",
                    rideId,
                },
                priority: "normal",
                ttl: 30,
            }));

        if (messages.length > 0) {
            await this.sendExpoPushBatch(messages);
        }
    }
}
