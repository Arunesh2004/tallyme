const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const c = await prisma.voucherCandidate.findMany({});
  console.log(c[c.length - 1]);
  await prisma.$disconnect();
}
main();
