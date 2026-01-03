const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: { email: true, role: true }
    });
    const announcements = await prisma.announcement.count();
    console.log('Users:', users);
    console.log('Announcement count:', announcements);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
