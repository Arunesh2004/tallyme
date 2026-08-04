const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe('CREATE DATABASE shadow_db;');
  console.log('shadow_db created');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
