const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Checking DB connection...");
        const users = await prisma.user.findMany();
        console.log("Connection successful! Users:", users);
    } catch (error) {
        console.error("Connection failed:", error.stack || error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
