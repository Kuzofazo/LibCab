const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cancelRides() {
  try {
    const result = await prisma.ride.updateMany({
      where: {
        status: {
          in: ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS']
        }
      },
      data: {
        status: 'CANCELLED' // CANCELLED is allowed by the model
      }
    });
    console.log(`Cancelled ${result.count} active rides.`);
  } catch (e) {
    console.error("Error cancelling rides:", e);
  } finally {
    await prisma.$disconnect();
  }
}

cancelRides();
