import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as completeRide } from '../app/api/rides/[id]/complete/route';
import { POST as payRide } from '../app/api/rides/[id]/pay/route';
import { PATCH as changeDestination } from '../app/api/rides/[id]/destination/route';
import { POST as cancelRide } from '../app/api/rides/[id]/cancel/route';
import { prisma } from '../lib/db';
import { verifyJWT } from '../lib/auth';
import { rideStreamManager } from '../lib/sse';

vi.mock('../lib/db', () => ({
    prisma: {
        ride: {
            findUnique: vi.fn(),
            update: vi.fn(),
        },
        rideOffer: {
            updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
        paymentTransaction: {
            create: vi.fn(),
        },
        dispatcherLog: {
            create: vi.fn().mockResolvedValue({ id: 'log-1' }),
        },
        driverProfile: {
            findUnique: vi.fn(),
        },
    },
}));

vi.mock('../lib/auth', () => ({
    verifyJWT: vi.fn(),
}));

vi.mock('../lib/sse', () => ({
    rideStreamManager: {
        publish: vi.fn(),
    },
}));

describe('AfriCab Ride Completion & Payment Workflow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /api/rides/[id]/complete', () => {
        it('should mark ride as awaiting payment and broadcast PAYMENT_REQUESTED', async () => {
            vi.mocked(verifyJWT).mockResolvedValue({ userId: 'driver-user-1', email: 'driver@test.com', role: 'DRIVER' });
            
            const mockRide = {
                id: 'ride-123',
                bookingReference: 'AC-123456',
                status: 'IN_PROGRESS',
                fare: 35.0,
                driverId: 'driver-profile-1',
                riderId: 'rider-1',
                originAddress: 'Sinkor',
                destAddress: 'Congo Town',
                driver: { user: { name: 'Joe Driver', phone: '0881111111' }, licensePlate: 'LB-123' },
            };

            vi.mocked(prisma.ride.findUnique).mockResolvedValue(mockRide as any);
            vi.mocked(prisma.ride.update).mockResolvedValue({
                ...mockRide,
                paymentAwaitingPassenger: true,
            } as any);

            const req = new Request('http://localhost/api/rides/ride-123/complete', {
                method: 'POST',
                body: JSON.stringify({ actualDistanceTravelled: 6.2 })
            });

            const res = await completeRide(req, { params: Promise.resolve({ id: 'ride-123' }) });
            expect(res.status).toBe(200);

            const data = await res.json();
            expect(data.awaitingPayment).toBe(true);
            expect(data.fare).toBe(35.0);

            expect(rideStreamManager.publish).toHaveBeenCalledWith(expect.objectContaining({
                type: 'PAYMENT_REQUESTED',
                rideId: 'ride-123',
            }));
        });
    });

    describe('POST /api/rides/[id]/pay', () => {
        it('should confirm payment, set status to COMPLETED and paid, and create transaction', async () => {
            vi.mocked(verifyJWT).mockResolvedValue({ userId: 'rider-1', email: 'rider@test.com', role: 'RIDER' });

            const mockRide = {
                id: 'ride-123',
                status: 'IN_PROGRESS',
                fare: 35.0,
                bookingReference: 'AC-123456',
                riderId: 'rider-1',
                driverId: 'driver-profile-1',
            };

            vi.mocked(prisma.ride.findUnique).mockResolvedValue(mockRide as any);
            vi.mocked(prisma.paymentTransaction.create).mockResolvedValue({
                id: 'txn-1',
                amount: 35.0,
                status: 'SUCCESS',
            } as any);

            vi.mocked(prisma.ride.update).mockResolvedValue({
                ...mockRide,
                status: 'COMPLETED',
                paymentStatus: 'PAID',
                paymentMethod: 'MOMO',
            } as any);

            const req = new Request('http://localhost/api/rides/ride-123/pay', {
                method: 'POST',
                body: JSON.stringify({
                    paymentMethod: 'MOMO',
                    paymentPhone: '+231 88 123 4567',
                    amount: 35.0,
                    isCancellation: false,
                })
            });

            const res = await payRide(req, { params: Promise.resolve({ id: 'ride-123' }) });
            expect(res.status).toBe(200);

            const data = await res.json();
            expect(data.success).toBe(true);
            expect(data.ride.status).toBe('COMPLETED');
            expect(data.ride.paymentStatus).toBe('PAID');

            expect(rideStreamManager.publish).toHaveBeenCalledWith(expect.objectContaining({
                type: 'PAYMENT_CONFIRMED',
                rideId: 'ride-123',
            }));
        });
    });

    describe('PATCH /api/rides/[id]/destination', () => {
        it('should update destination, recalculate fare and broadcast DESTINATION_CHANGED', async () => {
            vi.mocked(verifyJWT).mockResolvedValue({ userId: 'rider-1', email: 'rider@test.com', role: 'RIDER' });

            const mockRide = {
                id: 'ride-123',
                bookingReference: 'AC-123456',
                status: 'IN_PROGRESS',
                originAddress: 'Sinkor',
                destAddress: 'Old Dest',
                destLat: 6.30,
                destLng: -10.79,
                fare: 25.0,
                originalFare: null,
            };

            vi.mocked(prisma.ride.findUnique).mockResolvedValue(mockRide as any);
            vi.mocked(prisma.ride.update).mockResolvedValue({
                ...mockRide,
                destAddress: 'New Broad St Dest',
                destLat: 6.32,
                destLng: -10.80,
                fare: 32.0,
                originalFare: 25.0,
            } as any);

            const req = new Request('http://localhost/api/rides/ride-123/destination', {
                method: 'PATCH',
                body: JSON.stringify({
                    newDestAddress: 'New Broad St Dest',
                    newDestLat: 6.32,
                    newDestLng: -10.80,
                    newFare: 32.0,
                })
            });

            const res = await changeDestination(req, { params: Promise.resolve({ id: 'ride-123' }) });
            expect(res.status).toBe(200);

            const data = await res.json();
            expect(data.success).toBe(true);
            expect(data.fareChanged).toBe(true);
            expect(data.newFare).toBe(32.0);

            expect(rideStreamManager.publish).toHaveBeenCalledWith(expect.objectContaining({
                type: 'DESTINATION_CHANGED',
                rideId: 'ride-123',
            }));
        });
    });

    describe('POST /api/rides/[id]/cancel (Scenario B: Mid-trip cancellation)', () => {
        it('should require payment if ride was already started', async () => {
            vi.mocked(verifyJWT).mockResolvedValue({ userId: 'rider-1', email: 'rider@test.com', role: 'RIDER' });

            const mockRide = {
                id: 'ride-123',
                status: 'IN_PROGRESS',
                startedAt: new Date(),
                fare: 30.0,
                bookingReference: 'AC-123456',
                driverId: 'driver-profile-1',
                depositDeducted: false,
            };

            vi.mocked(prisma.ride.findUnique).mockResolvedValue(mockRide as any);
            vi.mocked(prisma.ride.update).mockResolvedValue({
                ...mockRide,
                cancelledAfterStart: true,
                cancellationFare: 15.0,
                paymentAwaitingPassenger: true,
            } as any);

            const req = new Request('http://localhost/api/rides/ride-123/cancel', {
                method: 'POST',
                body: JSON.stringify({
                    reason: 'Emergency stop required',
                    cancelledBy: 'RIDER',
                })
            });

            const res = await cancelRide(req, { params: Promise.resolve({ id: 'ride-123' }) });
            expect(res.status).toBe(200);

            const data = await res.json();
            expect(data.requiresPayment).toBe(true);
            expect(data.action).toBe('PAYMENT_REQUIRED');
            expect(data.cancellationFare).toBe(15.0);

            expect(rideStreamManager.publish).toHaveBeenCalledWith(expect.objectContaining({
                type: 'PAYMENT_REQUESTED',
                rideId: 'ride-123',
            }));
        });
    });
});
