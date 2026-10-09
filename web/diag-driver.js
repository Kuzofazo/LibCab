const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diag() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'john@africab.com' }
    });

    if (!user) {
      console.log("DIAG: User not found!");
      return;
    }

    console.log("DIAG: User found.");
    console.log("Email:", user.email);
    console.log("Role:", user.role);
    console.log("IsActive:", user.isActive);
    console.log("Password Hash Exists:", !!user.password);
    console.log("ForcePasswordChange:", user.forcePasswordChange);

  } catch (e) {
    console.error("DIAG ERROR:", e);
  } finally {
    await prisma.$disconnect();
  }
}

diag();
