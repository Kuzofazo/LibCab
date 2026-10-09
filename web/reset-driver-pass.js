const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function reset() {
  try {
    const hashedPassword = await bcrypt.hash('User123!', 10);
    await prisma.user.update({
      where: { email: 'john@africab.com' },
      data: { password: hashedPassword, forcePasswordChange: true }
    });
    console.log('RESET_SUCCESS');
  } catch (e) {
    console.error('RESET_FAILED:', e);
  } finally {
    await prisma.$disconnect();
  }
}

reset();
