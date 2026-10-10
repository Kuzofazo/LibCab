import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import { Platform, Vibration } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { apiClient } from './apiClient';

// Configure foreground notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
    }),
});

export const RIDE_REQUEST_CHANNEL_ID = 'ride_requests';

// Sound player reference for continuous ringing during incoming ride offer
let incomingSoundInstance: Audio.Sound | null = null;
let vibrationInterval: any = null;

export class NotificationService {
    /**
     * Set up Android high-priority notification channels
     */
    public static async setupNotificationChannels(): Promise<void> {
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync(RIDE_REQUEST_CHANNEL_ID, {
                name: 'Ride Requests',
                description: 'Urgent incoming passenger ride requests matching your location',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 500, 250, 500, 250, 500],
                sound: 'default',
                enableLights: true,
                lightColor: '#D32F2F',
                lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
                bypassDnd: true,
                showBadge: true,
            });
        }
    }

    /**
     * Register device for push notifications and sync token with AfriCab backend
     */
    public static async registerForPushNotificationsAsync(): Promise<{
        token: string | null;
        granted: boolean;
        error?: string;
    }> {
        try {
            await this.setupNotificationChannels();

            const existingPerms: any = await Notifications.getPermissionsAsync();
            let isGranted: boolean = Boolean(existingPerms?.granted || existingPerms?.status === 'granted');

            if (!isGranted) {
                const requestedPerms: any = await Notifications.requestPermissionsAsync({
                    ios: {
                        allowAlert: true,
                        allowBadge: true,
                        allowSound: true,
                        allowCriticalAlerts: true,
                    },
                });
                isGranted = Boolean(requestedPerms?.granted || requestedPerms?.status === 'granted');
            }

            if (!isGranted) {
                return {
                    token: null,
                    granted: false,
                    error: 'Permission not granted for push notifications.',
                };
            }

            // Get push token
            let token: string | null = null;
            try {
                // Fetch Expo Push Token (works seamlessly with FCM & APNs)
                const pushTokenData = await Notifications.getExpoPushTokenAsync({
                    projectId: 'africab-mobile',
                }).catch(async () => {
                    // Fallback without explicit projectId if not configured in EAS
                    return await Notifications.getExpoPushTokenAsync();
                });
                token = pushTokenData.data;
            } catch (err: any) {
                console.warn('Push token retrieval notice (may occur in unlinked emulator):', err.message);
                // In dev emulator without Play Services, generate a deterministic device-anchor token for testing
                token = `ExponentPushToken[dev_${Platform.OS}_${Date.now().toString(36)}]`;
            }

            if (token) {
                await AsyncStorage.setItem('@africab_push_token', token);

                // Register token with backend server
                try {
                    await apiClient('/api/driver/push-token', {
                        method: 'POST',
                        body: JSON.stringify({
                            pushToken: token,
                            platform: Platform.OS,
                            soundEnabled: true,
                            vibrationEnabled: true,
                        }),
                    });
                } catch (apiErr) {
                    console.error('Failed to register push token with backend:', apiErr);
                }
            }

            return { token, granted: true };
        } catch (error: any) {
            console.error('Push registration error:', error);
            return { token: null, granted: false, error: error.message };
        }
    }

    /**
     * Request device location permissions (Foreground and Background)
     */
    public static async requestLocationPermissionsAsync(): Promise<{
        foreground: boolean;
        background: boolean;
    }> {
        try {
            const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
            if (fgStatus !== 'granted') {
                return { foreground: false, background: false };
            }

            let bgGranted = false;
            try {
                const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
                bgGranted = bgStatus === 'granted';
            } catch {
                // Background permission can fail on certain emulator setups
            }

            return { foreground: true, background: bgGranted };
        } catch (e) {
            console.error('Location permission request failed:', e);
            return { foreground: false, background: false };
        }
    }

    /**
     * Start continuous audible and vibrating alert for incoming ride request
     */
    public static async startIncomingRideAlarm(): Promise<void> {
        try {
            this.stopIncomingRideAlarm();

            // Set audio mode for loud alerts
            await Audio.setAudioModeAsync({
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                shouldDuckAndroid: true,
            }).catch(() => {});

            // Start vibration pattern
            Vibration.vibrate([500, 500, 500, 500, 500, 500], true);

            // Play loud alert tone
            const { sound } = await Audio.Sound.createAsync(
                { uri: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg' },
                { shouldPlay: true, isLooping: true, volume: 1.0 }
            );
            incomingSoundInstance = sound;
            await sound.playAsync();
        } catch (error) {
            console.warn('Alarm audio playback notice:', error);
            // Fallback to vibration only
            Vibration.vibrate([500, 500, 500, 500], true);
        }
    }

    /**
     * Stop audible and vibrating alert once ride is accepted, declined, or expired
     */
    public static async stopIncomingRideAlarm(): Promise<void> {
        try {
            Vibration.cancel();
            if (vibrationInterval) {
                clearInterval(vibrationInterval);
                vibrationInterval = null;
            }
            if (incomingSoundInstance) {
                await incomingSoundInstance.stopAsync();
                await incomingSoundInstance.unloadAsync();
                incomingSoundInstance = null;
            }
        } catch {
            // Ignore clean up errors
        }
    }
}
