import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getDrivers } from '../app/api/admin/drivers/route';
import { GET as getAssignment } from '../app/api/driver/current-assignment/route';
import { prisma } from '../lib/db';
import { verifyJWT } from '../lib/auth';

// Mock dependencies
vi.mock('../lib/db', () => ({
    prisma: {
        user: {
            findMany: vi.fn(),
        },
        driverProfile: {
            findUnique: vi.fn(),
        },
        ride: {
            findFirst: vi.fn(),
        }
    },
}));

vi.mock('../lib/auth', () => ({
    verifyJWT: vi.fn(),
}));

describe('New Feature Endpoints', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /api/admin/drivers', () => {
        it('should fetch drivers and map currentLat and currentLng correctly', async () => {
            const mockDrivers = [{
                id: 'driver-1',
                name: 'John Doe',
                email: 'john@example.com',
                phone: '1234',
                createdAt: new Date(),
                driverProfile: {
                    id: 'dp-1',
                    isOnline: true,
                    rating: 4.8,
                    vehicleColor: 'Blue',
                    vehicleModel: 'Toyota',
                    licensePlate: 'ABC-123',
                    currentLat: 6.3156,
                    currentLng: -10.8074
                }
            }];
            
            (prisma.user.findMany as any).mockResolvedValue(mockDrivers);

            const response = await getDrivers();
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data).toHaveLength(1);
            expect(data[0].currentLat).toBe(6.3156);
            expect(data[0].currentLng).toBe(-10.8074);
            expect(data[0].status).toBe('ONLINE');
        });
    });

    describe('GET /api/driver/current-assignment', () => {
        it('should return 401 if not authorized or not a driver', async () => {
            (verifyJWT as any).mockResolvedValue(null);
            let res = await getAssignment();
            expect(res.status).toBe(401);

            (verifyJWT as any).mockResolvedValue({ userId: '1', role: 'RIDER' });
            res = await getAssignment();
            expect(res.status).toBe(401);
        });

        it('should correctly fetch the active assignment for a verified driver', async () => {
            (verifyJWT as any).mockResolvedValue({ userId: 'user-drv-1', role: 'DRIVER' });
            (prisma.driverProfile.findUnique as any).mockResolvedValue({ id: 'dp-1' });
            
            const mockRide = {
                id: 'ride-1',
                status: 'ASSIGNED',
                originAddress: 'Point A',
                driverId: 'dp-1'
            };
            (prisma.ride.findFirst as any).mockResolvedValue(mockRide);

            const res = await getAssignment();
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(prisma.ride.findFirst).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    driverId: 'dp-1',
                    status: { in: ['ACCEPTED', 'ASSIGNED'] }
                })
            }));
            expect(data.id).toBe('ride-1');
        });
    });
});
