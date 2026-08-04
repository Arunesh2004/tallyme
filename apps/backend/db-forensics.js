const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
  const ics = await prisma.invoiceCandidate.findMany({
    include: { document: true },
    orderBy: { id: 'desc' },
    take: 30
  });
  
  const vcs = await prisma.voucherCandidate.findMany({
    orderBy: { id: 'desc' },
    take: 10
  });

  const vendors = await prisma.vendor.findMany();
  
  fs.writeFileSync('forensics_db.json', JSON.stringify({ ics, vcs, vendors }, null, 2));
  console.log('Saved to forensics_db.json');
}

main().catch(console.error).finally(() => prisma.$disconnect());
