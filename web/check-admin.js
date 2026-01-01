const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function checkAdmin() {
    try {
        const admin = await prisma.user.findUnique({
            where: { email: 'admin@paye.com' }
        });

        if (!admin) {
            console.log('ADMIN_NOT_FOUND');
            return;
        }

        const isValid = await bcrypt.compare('admin', admin.password);
        if (isValid) {
            console.log('ADMIN_PASSWORD_VALID');
        } else {
            console.log('ADMIN_PASSWORD_INVALID');
        }
    } catch (e) {
        console.log('ERROR: ' + e.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkAdmin();
