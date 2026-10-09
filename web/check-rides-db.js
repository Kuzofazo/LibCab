const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rides = await prisma.ride.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true, originAddress: true, createdAt: true, riderId: true, guestPhone: true }
  });
  console.log(JSON.stringify(rides, null, 2));
}

main()
  .catch(e => {
    console.error(e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
