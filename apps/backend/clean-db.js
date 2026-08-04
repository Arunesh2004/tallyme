const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clean() {
  await prisma.eRPSyncJob.deleteMany();
  await prisma.voucherCandidate.deleteMany();
  await prisma.invoiceCandidate.deleteMany();
  await prisma.vendorSlipAudit.deleteMany();
  console.log('Database cleaned');
}

clean().catch(console.error).finally(() => prisma.$disconnect());
