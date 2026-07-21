import 'dotenv/config';
import { prisma } from '../shared/db/prisma';
import { VoucherOrchestrator } from '../modules/accounting/voucher/services/VoucherOrchestrator';

async function main() {
  console.log("=========================================================");
  console.log("VOUCHER GENERATION PIPELINE VERIFICATION");
  console.log("=========================================================\n");

  const orchestrator = new VoucherOrchestrator();

  console.log("1. Seeding Mock Accounting Ledgers & Transaction...");
  
  const hdfc = await prisma.accountingLedger.create({
    data: { name: 'HDFC Bank', parentGroup: 'Bank Accounts', isActive: true, payload: {}, organizationId: 'org_default' }
  });
  const tuition = await prisma.accountingLedger.create({
    data: { name: 'Tuition Income', parentGroup: 'Direct Incomes', isActive: true, payload: {}, organizationId: 'org_default' }
  });
  const inactiveLedger = await prisma.accountingLedger.create({
    data: { name: 'Old Ledger', parentGroup: 'Direct Incomes', isActive: false, payload: {}, organizationId: 'org_default' }
  });

  const tx1 = await prisma.accountingTransaction.create({
    data: {
      referenceId: 'fee-txn-001',
      referenceType: 'FEE_RECEIPT',
      transactionDate: new Date(),
      description: 'Fee Payment',
      voucherType: 'RECEIPT',
      sourceEventId: 'evt-001',
      organizationId: 'org_default',
      entries: {
        create: [
          { ledgerId: hdfc.id, debit: 1000, credit: 0 },
          { ledgerId: tuition.id, debit: 0, credit: 1000 }
        ]
      }
    },
    include: { entries: true }
  });

  const tx2 = await prisma.accountingTransaction.create({
    data: {
      referenceId: 'fee-txn-002',
      referenceType: 'FEE_RECEIPT',
      transactionDate: new Date(),
      description: 'Invalid Payment',
      voucherType: 'RECEIPT',
      sourceEventId: 'evt-002',
      organizationId: 'org_default',
      entries: {
        create: [
          { ledgerId: hdfc.id, debit: 1000, credit: 0 },
          { ledgerId: inactiveLedger.id, debit: 0, credit: 1000 }
        ]
      }
    },
    include: { entries: true }
  });

  console.log("✅ Seeded Data.");

  const event1 = { payload: tx1 };
  const event2 = { payload: tx2 };

  console.log("\n2. Processing Valid Transaction (Expected: SUCCESS)...");
  await orchestrator.generateVoucher(event1, 'org_default');
  console.log("✅ Processing complete.");

  console.log("\n3. Processing Invalid Transaction (Inactive Ledger) (Expected: MANUAL REVIEW)...");
  await orchestrator.generateVoucher(event2, 'org_default');
  console.log("✅ Processing complete.");

  console.log("\n4. Verifying Database State...");
  
  const vouchers = await prisma.accountingVoucher.findMany({ 
    where: { organizationId: 'org_default' },
    include: { entries: true }
  });
  
  const manualReviews = await prisma.manualReview.findMany({
    where: { type: 'VOUCHER_VALIDATION_FAILURE', organizationId: 'org_default' }
  });

  console.log(`Vouchers Generated: ${vouchers.length} (Expected: 1)`);
  console.log(`Manual Reviews Generated: ${manualReviews.length} (Expected: 1)`);
  
  let passed = true;
  if (vouchers.length !== 1 || vouchers[0].entries.length !== 2) {
    passed = false;
    console.log("❌ Voucher compilation failed.");
  }
  if (manualReviews.length !== 1) {
    passed = false;
    console.log("❌ Manual Review fallback failed.");
  }

  if (passed) {
    console.log("\n🎉 SUCCESS! Voucher Compilation, Validation, and Safety Fallbacks worked perfectly.");
  }

  console.log("\nCleaning up...");
  await prisma.voucherEntry.deleteMany({ where: { voucher: { organizationId: 'org_default' } } });
  await prisma.accountingVoucher.deleteMany({ where: { organizationId: 'org_default' } });
  await prisma.manualReview.deleteMany({ where: { organizationId: 'org_default' } });
  await prisma.accountingEntry.deleteMany({ where: { transaction: { organizationId: 'org_default' } } });
  await prisma.accountingTransaction.deleteMany({ where: { organizationId: 'org_default' } });
  await prisma.accountingLedger.deleteMany({ where: { organizationId: 'org_default' } });
  await prisma.eventOutbox.deleteMany({ where: { organizationId: 'org_default' } });
  
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("FATAL ERROR:", error);
  await prisma.$disconnect();
  process.exit(1);
});
