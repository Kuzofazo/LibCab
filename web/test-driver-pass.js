const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function testPassword() {
  const email = 'john@africab.com';
  const passwordsToTest = ['User123!', 'password123', 'admin', '123456'];

  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
        console.log("USER_NOT_FOUND");
        return;
    }

    for (const pw of passwordsToTest) {
      if (await bcrypt.compare(pw, user.password)) {
        console.log(`PASSWORD_MATCH_FOUND: ${pw}`);
        return;
      }
    }
    console.log("NO_PASSWORD_MATCH_FOUND");

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

testPassword();
