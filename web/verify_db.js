const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  console.log("--- USERS ---");
  const users = await prisma.user.findMany({
    include: { driverProfile: true },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log(JSON.stringify(users, null, 2));

  console.log("\n--- DISPATCHER LOGS ---");
  const logs = await prisma.dispatcherLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log(JSON.stringify(logs, null, 2));
}

verify().catch(console.error).finally(() => prisma.$disconnect());
