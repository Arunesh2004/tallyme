const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const ic = await prisma.invoiceCandidate.findFirst();
  console.log(JSON.stringify(ic, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
