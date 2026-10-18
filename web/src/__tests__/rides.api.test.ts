import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, PATCH } from '../app/api/rides/route';
import { prisma } from '../lib/db';
import { verifyJWT } from '../lib/auth';

// Mock the dependencies
vi.mock('../lib/db', () => ({
    prisma: {
        ride: {
            findMany: vi.fn(),
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
        },
        user: {
            findUnique: vi.fn(),
            create: vi.fn(),
        },
        driverProfile: {
            findMany: vi.fn().mockResolvedValue([]),
            findUnique: vi.fn(),
            create: vi.fn(),
        },
        dispatcherLog: {
            create: vi.fn(),
        },
    },
}));

vi.mock('../lib/auth', () => ({
    verifyJWT: vi.fn(),
}));

describe('Rides API', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /api/rides', () => {
        it('should return 401 if unauthorized', async () => {
            vi.mocked(verifyJWT).mockResolvedValue(null);
            const req = new Request('http://localhost:3000/api/rides');
            const response = await GET(req);
            expect(response.status).toBe(401);
        });

        it('should return rides if authorized', async () => {
            vi.mocked(verifyJWT).mockResolvedValue({ userId: '1', email: 'admin@test.com', role: 'ADMIN' });
            vi.mocked(prisma.ride.findMany).mockResolvedValue([{ id: 'ride-1' }] as unknown as Awaited<ReturnType<typeof prisma.ride.findMany>>);
            
            const req = new Request('http://localhost:3000/api/rides');
            const response = await GET(req);
            const data = await response.json();
            
            expect(response.status).toBe(200);
            expect(data).toHaveLength(1);
        });
    });

    describe('POST /api/rides', () => {
        it('should return 401 if unauthorized', async () => {
            vi.mocked(verifyJWT).mockResolvedValue(null);
            const req = new Request('http://localhost/api/rides', { method: 'POST', body: JSON.stringify({}) });
            const response = await POST(req);
            expect(response.status).toBe(401);
        });

        it('should create a ride for a guest user correctly', async () => {
            vi.mocked(verifyJWT).mockResolvedValue({ userId: 'admin-1', email: 'admin@test.com', role: 'ADMIN' });
            vi.mocked(prisma.user.findUnique).mockResolvedValue(null); // Guest not found
            vi.mocked(prisma.user.create).mockResolvedValue({ id: 'guest-id' } as unknown as Awaited<ReturnType<typeof prisma.user.create>>);
            vi.mocked(prisma.ride.create).mockResolvedValue({ id: 'new-ride-id' } as unknown as Awaited<ReturnType<typeof prisma.ride.create>>);
            vi.mocked(prisma.driverProfile.findMany).mockResolvedValue([]);

            const body = {
                guestPhone: '123456',
                originAddress: 'Point A',
                destAddress: 'Point B',
            };
            const req = new Request('http://localhost/api/rides', { method: 'POST', body: JSON.stringify(body) });
            
            const response = await POST(req);
            expect(response.status).toBe(200);
            expect(prisma.user.create).toHaveBeenCalled(); // Should create guest user
            expect(prisma.ride.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    riderId: 'guest-id',
                    originAddress: 'Point A',
                    guestPhone: '123456',
                }),
            }));
        });
    });

    describe('PATCH /api/rides', () => {
        it('should resolve driverProfile from userId correctly', async () => {
            vi.mocked(verifyJWT).mockResolvedValue({ userId: 'admin-1', email: 'admin@test.com', role: 'ADMIN' });
            vi.mocked(prisma.driverProfile.findUnique).mockResolvedValue({ id: 'profile-id' } as unknown as Awaited<ReturnType<typeof prisma.driverProfile.findUnique>>);
            vi.mocked(prisma.ride.update).mockResolvedValue({ id: 'ride-id' } as unknown as Awaited<ReturnType<typeof prisma.ride.update>>);

            const body = { id: 'ride-id', driverId: 'user-id-of-driver' };
            const req = new Request('http://localhost/api/rides', { method: 'PATCH', body: JSON.stringify(body) });

            const response = await PATCH(req);
            expect(response.status).toBe(200);
            expect(prisma.ride.update).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    driverId: 'profile-id',
                }),
            }));
            expect(prisma.dispatcherLog.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    dispatcherId: 'admin-1',
                    action: 'ASSIGN_DRIVER',
                })
            }));
        });

        it('should return 400 if target user is not a driver', async () => {
            vi.mocked(verifyJWT).mockResolvedValue({ userId: 'admin-1', email: 'admin@test.com', role: 'ADMIN' });
            vi.mocked(prisma.driverProfile.findUnique).mockResolvedValue(null);
            vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-id', role: 'RIDER' } as unknown as Awaited<ReturnType<typeof prisma.user.findUnique>>);

            const body = { id: 'ride-id', driverId: 'user-id' };
            const req = new Request('http://localhost/api/rides', { method: 'PATCH', body: JSON.stringify(body) });

            const response = await PATCH(req);
            expect(response.status).toBe(400);
        });
    });
});
