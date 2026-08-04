const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const tasks = await prisma.manualReviewTask.findMany();
  console.log('ManualReviewTasks:', tasks.length);
}

run().catch(console.error).finally(() => prisma.$disconnect());
