const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const tables = await prisma.$queryRaw`SELECT schemaname, tablename FROM pg_tables`;
        // filter for Ride
        const ride = tables.find(t => t.tablename === 'Ride' || t.tablename === 'ride');
        console.log("Found Ride:", ride);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
run();
