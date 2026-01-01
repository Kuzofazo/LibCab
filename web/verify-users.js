const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function verify() {
    try {
        await prisma.$connect();
        console.log('Connected to database successfully\n');

        const users = await prisma.user.findMany({
            select: {
                email: true,
                name: true,
                role: true,
                password: true
            }
        });

        console.log(`Found ${users.length} users:\n`);

        for (const user of users) {
            console.log(`Email: ${user.email}`);
            console.log(`Name: ${user.name}`);
            console.log(`Role: ${user.role}`);
            console.log(`Password hash: ${user.password.substring(0, 20)}...`);

            // Test password verification
            if (user.email === 'admin@paye.com') {
                const isValid = await bcrypt.compare('admin', user.password);
                console.log(`Password 'admin' matches: ${isValid}`);
            }
            console.log('---\n');
        }
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

verify();
