const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const attempts = await prisma.eRPSyncAttempt.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  if (attempts.length === 0) {
    console.log("No ERP Sync Attempts found.");
    return;
  }
  
  console.log(`Found ${attempts.length} recent attempts:`);
  attempts.forEach(a => {
    console.log(`- [${a.createdAt.toISOString()}] Job ${a.jobId} | Response: ${a.responseType} | Message: ${a.errorMessage}`);
  });
}

run().catch(console.error).finally(() => prisma.$disconnect());
