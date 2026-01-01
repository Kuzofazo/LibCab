const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const adminPassword = await bcrypt.hash('admin', 10);

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

    const driver = await prisma.user.upsert({
        where: { email: 'driver@example.com' },
        update: { password: hashedPassword },
        create: {
            email: 'driver@example.com',
            password: hashedPassword,
            name: 'Driver One',
            role: 'DRIVER',
            driverProfile: {
                create: {
                    isOnline: true,
                    vehicleType: 'Sedan',
                    vehicleModel: 'Toyota Camry',
                    vehicleColor: 'Red',
                    licensePlate: 'ABC-123',
                }
            }
        },
    });

    console.log({ admin, rider, driver });
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    });
