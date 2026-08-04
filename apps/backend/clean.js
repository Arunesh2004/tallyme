const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.invoiceFingerprint.deleteMany();
  await prisma.duplicateDetectionPolicy.deleteMany();
}

main().finally(() => prisma.$disconnect());
