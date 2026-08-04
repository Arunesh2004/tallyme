const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const companies = await prisma.company.findMany();
  console.log('Companies:', companies.map(c => c.id));
}

run().catch(console.error).finally(() => prisma.$disconnect());
