const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const audits = await prisma.vendorSlipAudit.findMany();
  console.log(JSON.stringify(audits, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
