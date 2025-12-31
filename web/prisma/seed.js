const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const admin = await prisma.user.upsert({
        where: { email: 'admin@paye.com' },
        update: {},
        create: {
            email: 'admin@paye.com',
            password: 'admin',
            name: 'Super Admin',
            role: 'ADMIN',
        },
    });

    const rider = await prisma.user.upsert({
        where: { email: 'rider@example.com' },
        update: {},
        create: {
            email: 'rider@example.com',
            password: 'password123',
            name: 'Rider One',
            role: 'RIDER',
        },
    });

    const driver = await prisma.user.upsert({
        where: { email: 'driver@example.com' },
        update: {},
        create: {
            email: 'driver@example.com',
            password: 'password123',
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
