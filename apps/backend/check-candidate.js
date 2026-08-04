const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const latest = await prisma.voucherCandidate.findMany({ where: { voucherNumber: '26886192' } });
  console.log(JSON.stringify(latest, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
