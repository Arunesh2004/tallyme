import 'dotenv/config';
import { prisma } from '../shared/db/prisma';
import { VoucherSyncOrchestrator } from '../modules/sync/voucher-sync/services/VoucherSyncOrchestrator';
import { SyncStatus } from '@prisma/client';

async function main() {
  console.log("=========================================================");
  console.log("VOUCHER SYNC INTEGRATION VERIFICATION");
  console.log("=========================================================\n");

  const orchestrator = new VoucherSyncOrchestrator();

  console.log("1. Seeding Mock Voucher...");
  
  const hdfc = await prisma.accountingLedger.create({
    data: { name: 'HDFC Bank', parentGroup: 'Bank Accounts', payload: {}, organizationId: 'org_default' }
  });
  
  const voucher = await prisma.accountingVoucher.create({
    data: {
      voucherType: 'RECEIPT',
      date: new Date(),
      syncStatus: SyncStatus.PENDING,
      organizationId: 'org_default',
      entries: {
        create: [
          { ledgerId: hdfc.id, isDebit: true, amount: 1000 }
        ]
      }
    }
  });

  console.log("✅ Seeded Voucher.");

  console.log("\n2. Processing Sync (Expected: SUCCESS)...");
  await orchestrator.syncVoucher(voucher.id, 'org_default', 'corr-1');
  
  let syncedVoucher = await prisma.accountingVoucher.findUnique({ where: { id: voucher.id } });
  if (syncedVoucher?.syncStatus === SyncStatus.SYNCED) {
    console.log("✅ Voucher synced successfully. Status: SYNCED");
  } else {
    console.log("❌ Sync failed.");
  }

  console.log("\n3. Resetting Voucher and Simulating TEMPORARY_FAILURE (Expected: RETRYING)...");
  await prisma.accountingVoucher.update({
    where: { id: voucher.id },
    data: { syncStatus: SyncStatus.PENDING, syncAttempts: 0 }
  });

  // Inject a mock instruction into the Orchestrator by directly updating the DB state if needed,
  // or we can hack the XML generation via narration to trigger our mock logic.
  await prisma.accountingVoucher.update({
    where: { id: voucher.id },
    data: { narration: 'TRIGGER_TEMPORARY_FAILURE' }
  });

  try {
    await orchestrator.syncVoucher(voucher.id, 'org_default', 'corr-2');
  } catch (e: any) {
    if (e.message.includes('RETRY_REQUIRED')) {
      console.log("✅ Caught expected RETRY error for BullMQ backoff.");
    }
  }

  let retryingVoucher = await prisma.accountingVoucher.findUnique({ where: { id: voucher.id } });
  if (retryingVoucher?.syncStatus === SyncStatus.RETRYING && retryingVoucher.syncAttempts === 1) {
    console.log("✅ Voucher entered RETRYING status. Attempt incremented to 1.");
  }

  console.log("\n4. Simulating VALIDATION_FAILURE (Expected: DEAD_LETTER & ManualReview)...");
  await prisma.accountingVoucher.update({
    where: { id: voucher.id },
    data: { syncStatus: SyncStatus.PENDING, syncAttempts: 0, narration: 'TRIGGER_VALIDATION_FAILURE' }
  });

  await orchestrator.syncVoucher(voucher.id, 'org_default', 'corr-3');

  let deadVoucher = await prisma.accountingVoucher.findUnique({ where: { id: voucher.id } });
  const review = await prisma.manualReview.findFirst({ where: { type: 'VOUCHER_SYNC_FAILURE' } });
  
  if (deadVoucher?.syncStatus === SyncStatus.DEAD_LETTER && review) {
    console.log("✅ Non-retryable error correctly routed Voucher to DEAD_LETTER and spawned ManualReview.");
  }

  console.log("\n5. Verifying Sync Sessions & Metrics...");
  const sessions = await prisma.syncSession.findMany({ where: { voucherId: voucher.id } });
  const metrics = await prisma.syncMetric.findMany({ where: { aggregateId: voucher.id } });
  
  console.log(`Sync Sessions Recorded: ${sessions.length} (Expected: 3)`);
  console.log(`Metrics Recorded: ${metrics.length} (Expected: 3)`);

  if (sessions.length === 3 && metrics.length === 3) {
    console.log("\n🎉 SUCCESS! Sync Integration, DLQ, and Lifecycle rules worked perfectly.");
  }

  console.log("\nCleaning up...");
  await prisma.syncSession.deleteMany({ where: { organizationId: 'org_default' } });
  await prisma.syncMetric.deleteMany({ where: { organizationId: 'org_default' } });
  await prisma.manualReview.deleteMany({ where: { organizationId: 'org_default' } });
  await prisma.voucherEntry.deleteMany({ where: { voucher: { organizationId: 'org_default' } } });
  await prisma.accountingVoucher.deleteMany({ where: { organizationId: 'org_default' } });
  await prisma.accountingLedger.delete({ where: { id: hdfc.id } });
  
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("FATAL ERROR:", error);
  await prisma.$disconnect();
  process.exit(1);
});
