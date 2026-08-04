const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const profiles = await prisma.vendorLedgerProfile.findMany();
  
  for (const p of profiles) {
    if (p.defaultLedgerCode === 'Sundry Creditors') {
      const vendor = await prisma.vendor.findUnique({ where: { id: p.vendorId } });
      if (vendor) {
        await prisma.vendorLedgerProfile.update({
          where: { id: p.id },
          data: { defaultLedgerCode: vendor.name }
        });
        console.log(`Updated ${vendor.name} ledger code from Sundry Creditors to ${vendor.name}`);
      }
    }
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
