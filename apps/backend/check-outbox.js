const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const events = await prisma.outboxEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 5 });
  console.log(JSON.stringify(events, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
