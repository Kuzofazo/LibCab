const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function list() {
  try {
    const tables = await prisma.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table'`);
    console.log("TABLES:", tables.map(t => t.name).join(", "));
  } catch (e) {
    console.error("ERROR LISTING TABLES:", e);
  } finally {
    await prisma.$disconnect();
  }
}

list();
