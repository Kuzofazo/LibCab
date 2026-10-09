const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const lastRide = await prisma.ride.findFirst({
      orderBy: { createdAt: 'desc' },
      include: { rider: true }
    });

    console.log("LAST RIDE DETAILS:");
    console.log("ID:", lastRide.id);
    console.log("Guest Name:", lastRide.guestName);
    console.log("Guest Phone:", lastRide.guestPhone);
    console.log("Origin:", lastRide.originAddress);
    console.log("Payment Method:", lastRide.paymentMethod);
    console.log("Rider Email (Placeholder):", lastRide.rider.email);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
