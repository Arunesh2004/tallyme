const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log("=== RECENT TRANSACTION DRAFTS ===");
  const drafts = await prisma.transactionDraft.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1
  });
  console.log(JSON.stringify(drafts, null, 2));

  console.log("\n=== RECENT VOUCHER CANDIDATES ===");
  const candidates = await prisma.voucherCandidate.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1
  });
  console.log(JSON.stringify(candidates, null, 2));

  console.log("\n=== RECENT ERP SYNC JOBS ===");
  const jobs = await prisma.eRPSyncJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 2
  });
  console.log(JSON.stringify(jobs, null, 2));

  console.log("\n=== RECENT OUTBOX EVENTS ===");
  const events = await prisma.outboxEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3
  });
  console.log(JSON.stringify(events, null, 2));
  
  console.log("\n=== RECENT AUDIT LOGS ===");
  const audits = await prisma.auditLog.findMany({
    orderBy: { timestamp: 'desc' },
    take: 5
  });
  console.log(JSON.stringify(audits, null, 2));
}

run().finally(() => prisma.$disconnect());
