const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const args = process.argv.slice(2);
  const targetDraftId = args[0]; // optional: filter by specific draft

  // --- PERF: ERPSyncJob timing ---
  console.log("=== RECENT ERP SYNC JOB TIMING ===");
  const jobs = await prisma.eRPSyncJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3,
    include: { stateTransitions: { orderBy: { createdAt: 'asc' } }, attemptsHistory: { orderBy: { requestTime: 'asc' } } }
  });

  for (const job of jobs) {
    const jobStart = job.createdAt;
    const jobEnd = job.updatedAt;
    const durationMs = new Date(jobEnd).getTime() - new Date(jobStart).getTime();
    console.log(`\nJob ID: ${job.id} | Status: ${job.status} | Attempts: ${job.attempts} | Duration: ${durationMs}ms`);
    console.log(`  VoucherCandidateId: ${job.voucherCandidateId}`);
    console.log(`  Last Response: ${job.lastResponse}`);
    console.log(`  transportStatus: ${job.transportStatus}`);
    console.log(`  retryCount: ${job.retryCount}`);
    console.log("  State Transitions:");
    for (const t of job.stateTransitions) {
      console.log(`    [${t.createdAt.toISOString()}] ${t.statusFrom} -> ${t.statusTo} | ${t.reason}`);
    }
    console.log("  Attempts:");
    for (const a of job.attemptsHistory) {
      console.log(`    [${a.requestTime?.toISOString() || 'N/A'}] ${a.responseType} | ${a.durationMs}ms | success:${a.success} | ${a.errorMessage || 'OK'}`);
    }
  }

  // --- DB Integrity: Orphan Checks ---
  console.log("\n=== DB INTEGRITY: ORPHAN VOUCHER CANDIDATES ===");
  const orphanCandidates = await prisma.$queryRaw`
    SELECT vc.id, vc."voucherNumber" FROM "VoucherCandidate" vc
    LEFT JOIN "ERPSyncJob" erp ON erp."voucherCandidateId" = vc.id
    WHERE erp.id IS NULL
    LIMIT 10
  `;
  console.log("Voucher Candidates without ERPSyncJob:", JSON.stringify(orphanCandidates, null, 2));

  console.log("\n=== DB INTEGRITY: DUPLICATE VOUCHER NUMBERS ===");
  const dupes = await prisma.$queryRaw`
    SELECT "voucherNumber", COUNT(*) as count FROM "VoucherCandidate"
    WHERE "voucherNumber" IS NOT NULL
    GROUP BY "voucherNumber" HAVING COUNT(*) > 1
  `;
  console.log("Duplicate voucher numbers:", JSON.stringify(dupes, null, 2));

  console.log("\n=== DB INTEGRITY: OUTBOX EVENTS (CURRENT) ===");
  const outbox = await prisma.transactionOutbox.findMany({
    take: 10,
    orderBy: { id: 'desc' }
  });
  console.log(`Total current outbox events: ${outbox.length}`);
  for (const ev of outbox) {
    console.log(`  [${ev.id}] type:${ev.eventType} status:${ev.status} processedAt:${ev.processedAt}`);
  }

  console.log("\n=== LEARNING: TransactionDraft with SYNCED Status ===");
  const syncedDrafts = await prisma.transactionDraft.findMany({
    where: { status: 'SYNCED' },
    orderBy: { updatedAt: 'desc' },
    take: 3
  });
  console.log("Synced drafts:", JSON.stringify(syncedDrafts.map(d => ({ id: d.id, status: d.status, updatedAt: d.updatedAt })), null, 2));

  console.log("\n=== LATEST TRANSACTION DRAFT ===");
  const latestDraft = await prisma.transactionDraft.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1
  });
  console.log(JSON.stringify(latestDraft, null, 2));

  console.log("\n=== RECENT AUDIT LOGS ===");
  const audits = await prisma.auditLog.findMany({
    orderBy: { timestamp: 'desc' },
    take: 5
  });
  console.log(JSON.stringify(audits, null, 2));
}

run().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
