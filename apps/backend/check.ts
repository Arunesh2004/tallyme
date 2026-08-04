import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const vc = await prisma.voucherCandidate.findFirst({
      where: { id: '70b48751-1b89-40ff-afe9-e963aab8b6d7' }
  });
  console.log('Metadata:', JSON.stringify(vc?.metadata, null, 2));
  await prisma.$disconnect();
}
run();
