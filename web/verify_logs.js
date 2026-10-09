const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  const adminCount = await prisma.user.count({ where: { role: 'SUPER_ADMIN' } });
  const riderCount = await prisma.user.count({ where: { role: 'RIDER' } });
  const driverCount = await prisma.user.count({ where: { role: 'DRIVER' } });

  console.log(`Summary: Super Admins: ${adminCount}, Riders: ${riderCount}, Drivers: ${driverCount}`);

  const recentLogs = await prisma.dispatcherLog.findMany({
    where: { 
      action: { in: ['ADMIN_CREATE_USER', 'ADMIN_UPDATE_USER'] }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  console.log('Recent Admin Logs:', JSON.stringify(recentLogs, null, 2));
}

verify().catch(console.error).finally(() => prisma.$disconnect());
