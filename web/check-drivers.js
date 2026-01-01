const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const drivers = await prisma.user.findMany({
            where: { role: 'DRIVER' }
        });
        console.log('Driver count:', drivers.length);
        console.log('Drivers:', drivers);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
