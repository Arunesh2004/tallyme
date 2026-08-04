const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const invs = await prisma.invoiceCandidate.findMany();
  console.log(`Invoices: ${invs.length}`);
  if (invs.length > 0) {
    console.log(invs.slice(-3).map(i => ({ id: i.id, status: i.status })));
  }

  const vouchers = await prisma.voucherCandidate.findMany();
  console.log(`Vouchers: ${vouchers.length}`);
  if (vouchers.length > 0) {
    console.log(vouchers.slice(-3).map(v => ({ id: v.id, status: v.status, syncStatus: v.syncStatus })));
  }

  const audits = await prisma.vendorSlipAudit.findMany();
  console.log(`Audits: ${audits.length}`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
