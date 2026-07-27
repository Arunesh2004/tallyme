import { PrismaClient } from '@prisma/client';
async function main() {
  const prisma = new PrismaClient();
  const candidates = await prisma.voucherValidationLog.findMany({ orderBy: { id: 'desc' }, take: 2 });
  console.log(JSON.stringify(candidates, null, 2));
  
  const c2 = await prisma.voucherCandidate.findMany({ orderBy: { id: 'desc' }, take: 1, include: { entries: true } });
  console.log(JSON.stringify(c2, null, 2));

  process.exit(0);
}
main();
