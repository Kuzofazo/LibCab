import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DispatchEngine } from '../services/dispatchEngine';
import { PushNotificationService } from '../services/pushNotificationService';
import { prisma } from '../lib/db';
import { rideStreamManager } from '../lib/sse';

// Mock dependencies
vi.mock('../lib/db', () => ({
    prisma: {
        driverProfile: {
            findMany: vi.fn().mockResolvedValue([]),
            findUnique: vi.fn().mockResolvedValue(null),
            update: vi.fn().mockResolvedValue({}),
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
            create: vi.fn().mockResolvedValue({}),
        },
        ride: {
            findUnique: vi.fn().mockResolvedValue(null),
            findFirst: vi.fn().mockResolvedValue(null),
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        rideOffer: {
            upsert: vi.fn().mockResolvedValue({}),
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
            findMany: vi.fn().mockResolvedValue([]),
        },
        dispatcherLog: {
            create: vi.fn().mockResolvedValue({}),
        },
    },
}));

vi.mock('../lib/sse', () => ({
    rideStreamManager: {
        publish: vi.fn(),
    },
}));

describe('Real-Time Ride Requests & Push Notification Matching System', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('1. Location-Based Driver Matching', () => {
        it('should identify nearest available online drivers and sort by proximity', async () => {
            // Customer at Broad Street, Monrovia (~6.3156, -10.8074)
            const customerLat = 6.3156;
            const customerLng = -10.8074;

            // Mock 3 drivers:
            // Driver 1: Very close (~1 km away)
            // Driver 2: Farther (~5 km away)
            // Driver 3: Too far away (> 20 km away)
            vi.mocked(prisma.driverProfile.findMany).mockResolvedValue([
                {
                    id: 'driver-far',
                    userId: 'u-far',
                    isOnline: true,
                    currentLat: 6.3500,
                    currentLng: -10.7600,
                    rating: 4.8,
                    vehicleType: 'Car',
                    vehicleModel: 'Toyota Corolla',
                    licensePlate: 'LB-1234',
                    maxDispatchRadiusKm: 12.0,
                    pushToken: 'ExponentPushToken[driver-far]',
                    fcmToken: null,
                    devicePlatform: 'android',
                    soundEnabled: true,
                    vibrationEnabled: true,
                    user: { name: 'Far Driver', phone: '0881111111', email: 'far@driver.com' },
                },
                {
                    id: 'driver-close',
                    userId: 'u-close',
                    isOnline: true,
                    currentLat: 6.3190,
                    currentLng: -10.8050,
                    rating: 4.9,
                    vehicleType: 'Car',
                    vehicleModel: 'Nissan Sunny',
                    licensePlate: 'LB-5678',
                    maxDispatchRadiusKm: 10.0,
                    pushToken: 'ExponentPushToken[driver-close]',
                    fcmToken: null,
                    devicePlatform: 'ios',
                    soundEnabled: true,
                    vibrationEnabled: true,
                    user: { name: 'Close Driver', phone: '0882222222', email: 'close@driver.com' },
                },
            ] as any);

            const matched = await DispatchEngine.findEligibleNearbyDrivers(
                customerLat,
                customerLng,
                'Car',
                15.0
            );

            expect(matched.length).toBe(2);
            // Closest driver should be first
            expect(matched[0].id).toBe('driver-close');
            expect(matched[0].distanceKm).toBeLessThan(matched[1].distanceKm);
            expect(matched[0].etaMinutes).toBeGreaterThanOrEqual(1);
        });

        it('should exclude drivers outside of their service radius', async () => {
            vi.mocked(prisma.driverProfile.findMany).mockResolvedValue([
                {
                    id: 'driver-limited-radius',
                    userId: 'u-lim',
                    isOnline: true,
                    currentLat: 6.4500, // ~16 km away
                    currentLng: -10.8000,
                    rating: 5.0,
                    vehicleType: 'Car',
                    vehicleModel: 'Kia Rio',
                    licensePlate: 'LB-9999',
                    maxDispatchRadiusKm: 5.0, // Only wants rides within 5 km
                    pushToken: 'ExponentPushToken[driver-lim]',
                    fcmToken: null,
                    devicePlatform: 'android',
                    soundEnabled: true,
                    vibrationEnabled: true,
                    user: { name: 'Limited Radius Driver', phone: '0883333333', email: 'lim@driver.com' },
                },
            ] as any);

            const matched = await DispatchEngine.findEligibleNearbyDrivers(6.3156, -10.8074, 'Car', 10.0);
            expect(matched.length).toBe(0);
        });
    });

    describe('2. Push Notification Dispatch & Expiration', () => {
        it('should broadcast high-priority push notifications and SSE events to matched drivers', async () => {
            const mockRide = {
                id: 'ride-123',
                status: 'REQUESTED',
                driverId: null,
                originAddress: 'Sinkor 12th Street',
                destAddress: 'Mamba Point Hotel',
                originLat: 6.3000,
                originLng: -10.7900,
                destLat: 6.3200,
                destLng: -10.8100,
                fare: 6.50,
                vehicleType: 'Car',
                rideCategory: 'Comfort',
                rider: { name: 'Alice Rider', phone: '0770001111' },
            };

            vi.mocked(prisma.ride.findUnique).mockResolvedValue(mockRide as any);
            vi.mocked(prisma.driverProfile.findMany).mockResolvedValue([
                {
                    id: 'driver-near',
                    userId: 'u-near',
                    isOnline: true,
                    currentLat: 6.3020,
                    currentLng: -10.7910,
                    rating: 5.0,
                    vehicleType: 'Car',
                    vehicleModel: 'Hyundai Elantra',
                    licensePlate: 'LB-7777',
                    maxDispatchRadiusKm: 10.0,
                    pushToken: 'ExponentPushToken[test-token-1]',
                    fcmToken: null,
                    devicePlatform: 'android',
                    soundEnabled: true,
                    vibrationEnabled: true,
                    user: { name: 'Near Driver', phone: '0884444444', email: 'near@driver.com' },
                },
            ] as any);

            // Spy on push notification sending
            const notifySpy = vi.spyOn(PushNotificationService, 'notifyDriversOfRideRequest').mockResolvedValue({
                sent: 1,
                skipped: 0,
            });

            const result = await DispatchEngine.broadcastRideOffers('ride-123');

            expect(result.offeredCount).toBe(1);
            expect(prisma.rideOffer.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        rideId_driverId: {
                            rideId: 'ride-123',
                            driverId: 'driver-near',
                        },
                    },
                })
            );

            expect(notifySpy).toHaveBeenCalledWith(
                expect.arrayContaining([expect.objectContaining({ id: 'driver-near' })]),
                expect.objectContaining({
                    rideId: 'ride-123',
                    originAddress: 'Sinkor 12th Street',
                    fare: 6.50,
                })
            );

            // Check SSE event broadcast
            expect(rideStreamManager.publish).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'RIDE_OFFER_RECEIVED',
                    rideId: 'ride-123',
                    driverId: 'driver-near',
                })
            );
        });
    });

    describe('3. Concurrency-Safe Atomic Ride Acceptance', () => {
        it('should successfully assign ride to first driver and notify others that ride is taken', async () => {
            vi.mocked(prisma.driverProfile.findUnique).mockResolvedValue({
                id: 'driver-winner',
                isOnline: true,
                user: { name: 'Winner Driver', phone: '0885555555' },
            } as any);

            // Mock no existing active trip
            vi.mocked(prisma.ride.findFirst).mockResolvedValue(null);

            // Atomic update succeeds (count: 1)
            vi.mocked(prisma.ride.updateMany).mockResolvedValue({ count: 1 });

            const mockUpdatedRide = {
                id: 'ride-123',
                status: 'ACCEPTED',
                driverId: 'driver-winner',
                originAddress: 'Point A',
                destAddress: 'Point B',
                rider: { name: 'Alice' },
                driver: { user: { name: 'Winner Driver' } },
            };
            vi.mocked(prisma.ride.findUnique).mockResolvedValue(mockUpdatedRide as any);

            // Other offers pending to be missed
            vi.mocked(prisma.rideOffer.findMany).mockResolvedValue([
                {
                    id: 'offer-loser',
                    driverId: 'driver-loser',
                    driver: { id: 'driver-loser', pushToken: 'ExponentPushToken[loser]', fcmToken: null },
                },
            ] as any);

            const acceptResult = await DispatchEngine.acceptRideOffer('ride-123', 'driver-winner');

            expect(acceptResult.success).toBe(true);
            expect(acceptResult.code).toBe('SUCCESS');

            // Winner offer updated to ACCEPTED
            expect(prisma.rideOffer.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { rideId: 'ride-123', driverId: 'driver-winner' },
                    data: expect.objectContaining({ status: 'ACCEPTED' }),
                })
            );

            // Other offers marked MISSED
            expect(prisma.rideOffer.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { rideId: 'ride-123', driverId: { not: 'driver-winner' }, status: 'PENDING' },
                    data: expect.objectContaining({ status: 'MISSED' }),
                })
            );

            // RIDE_TAKEN broadcast to loser driver
            expect(rideStreamManager.publish).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'RIDE_TAKEN',
                    driverId: 'driver-loser',
                })
            );

            // RIDE_ACCEPTED broadcast
            expect(rideStreamManager.publish).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'RIDE_ACCEPTED',
                    rideId: 'ride-123',
                    driverId: 'driver-winner',
                })
            );
        });

        it('should reject race condition if ride was already accepted by another driver', async () => {
            vi.mocked(prisma.driverProfile.findUnique).mockResolvedValue({
                id: 'driver-late',
                isOnline: true,
                user: { name: 'Late Driver', phone: '0886666666' },
            } as any);

            // Atomic update fails because ride was already claimed (count: 0)
            vi.mocked(prisma.ride.updateMany).mockResolvedValue({ count: 0 });

            const acceptResult = await DispatchEngine.acceptRideOffer('ride-123', 'driver-late');

            expect(acceptResult.success).toBe(false);
            expect(acceptResult.code).toBe('ALREADY_TAKEN');
            expect(acceptResult.message).toContain('already accepted by another driver');
        });
    });

    describe('4. Push Notification Utility Validation', () => {
        it('should correctly identify valid Expo push tokens', () => {
            expect(PushNotificationService.isExpoPushToken('ExponentPushToken[abcdef123456]')).toBe(true);
            expect(PushNotificationService.isExpoPushToken('ExpoPushToken[abcdef123456]')).toBe(true);
            expect(PushNotificationService.isExpoPushToken('invalid-token')).toBe(false);
            expect(PushNotificationService.isExpoPushToken('')).toBe(false);
        });
    });
});
