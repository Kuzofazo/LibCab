const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function seed() {
    console.log('Starting seed process...');
    try {
        const hashedPassword = await bcrypt.hash('password123', 10);
        const adminPassword = await bcrypt.hash('admin', 10);

        console.log('Upserting Admin...');
        const admin = await prisma.user.upsert({
            where: { email: 'admin@paye.com' },
            update: { password: adminPassword },
            create: {
                email: 'admin@paye.com',
                password: adminPassword,
                name: 'Super Admin',
                role: 'ADMIN',
            },
        });

        console.log('Upserting Rider...');
        const rider = await prisma.user.upsert({
            where: { email: 'rider@example.com' },
            update: { password: hashedPassword },
            create: {
                email: 'rider@example.com',
                password: hashedPassword,
                name: 'Rider One',
                role: 'RIDER',
            },
        });

        console.log('Upserting Driver...');

        // Driver 1
        const driver = await prisma.user.upsert({
            where: { email: 'driver@example.com' },
            update: { password: hashedPassword },
            create: {
                email: 'driver@example.com',
                password: hashedPassword,
                name: 'Prince Johnson',
                role: 'DRIVER',
                phone: '0886000001',
                driverProfile: {
                    create: {
                        isOnline: true,
                        vehicleType: 'Sedan',
                        vehicleModel: 'Toyota Camry (Red)',
                        vehicleColor: 'Red',
                        licensePlate: 'ABC-123',
                        pob: 'Monrovia',
                        country: 'Liberia',
                        rating: 4.8
                    }
                }
            },
        });

        // Driver 2
        await prisma.user.upsert({
            where: { email: 'driver2@example.com' },
            update: { password: hashedPassword },
            create: {
                email: 'driver2@example.com',
                password: hashedPassword,
                name: 'Sarah Doe',
                role: 'DRIVER',
                phone: '0777000002',
                driverProfile: {
                    create: {
                        isOnline: true,
                        vehicleType: 'SUV',
                        vehicleModel: 'Nissan Patrol (Black)',
                        vehicleColor: 'Black',
                        licensePlate: 'XYZ-789',
                        pob: 'Gbarnga',
                        country: 'Liberia',
                        rating: 4.9
                    }
                }
            },
        });

        // Driver 3
        await prisma.user.upsert({
            where: { email: 'driver3@example.com' },
            update: { password: hashedPassword },
            create: {
                email: 'driver3@example.com',
                password: hashedPassword,
                name: 'Michael Smith',
                role: 'DRIVER',
                phone: '0888000003',
                driverProfile: {
                    create: {
                        isOnline: false,
                        vehicleType: 'Sedan',
                        vehicleModel: 'Hyundai Elantra (Blue)',
                        vehicleColor: 'Blue',
                        licensePlate: 'LBR-555',
                        pob: 'Buchanan',
                        country: 'Liberia',
                        rating: 4.5
                    }
                }
            },
        });

        console.log('Seed successful!', { adminEmail: admin.email, riderEmail: rider.email, driverEmail: driver.email });
    } catch (e) {
        console.error('Seed failed:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

seed();
