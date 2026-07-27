import { PrismaClient } from '@prisma/client';
async function main() {
  const prisma = new PrismaClient();
  const candidates = await prisma.voucherCandidate.findMany({ orderBy: { id: 'desc' }, take: 5 });
  console.log(JSON.stringify(candidates, null, 2));
  process.exit(0);
}
main();
