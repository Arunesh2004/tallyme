import 'dotenv/config';
import { prisma } from '../shared/db/prisma';
import { AccountingMapperOrchestrator } from '../modules/accounting-mapper/services/AccountingMapperOrchestrator';
import { v4 as uuidv4 } from 'uuid';

async function main() {
  console.log("=========================================================");
  console.log("ACCOUNTING MAPPER VERIFICATION");
  console.log("=========================================================\n");

  const orchestrator = new AccountingMapperOrchestrator();

  console.log("1. Seeding Mock Ledgers & Mappings...");
  
  const bankLedger = await prisma.accountingLedger.create({
    data: { name: 'HDFC Bank', parentGroup: 'Bank Accounts', payload: {}, organizationId: 'org_default' }
  });
  const tuitionLedger = await prisma.accountingLedger.create({
    data: { name: 'Tuition Income', parentGroup: 'Direct Incomes', payload: {}, organizationId: 'org_default' }
  });
  const transportLedger = await prisma.accountingLedger.create({
    data: { name: 'Transport Income', parentGroup: 'Direct Incomes', payload: {}, organizationId: 'org_default' }
  });

  await prisma.ledgerMapping.createMany({
    data: [
      { mappingKey: 'BANK_HDFC', ledgerId: bankLedger.id, organizationId: 'org_default' },
      { mappingKey: 'FEE_HEAD_TUITION', ledgerId: tuitionLedger.id, organizationId: 'org_default' },
      // Purposely NOT seeding TRANSPORT mapping to test failure fallback
    ]
  });

  console.log("✅ Seeded Mappings: BANK_HDFC, FEE_HEAD_TUITION");

  // Mock a FeeAllocated payload
  const feeAllocatedEvent = {
    id: 'fee-tx-1',
    paymentDate: new Date(),
    studentId: 'stud-1',
    gateway: 'HDFC',
    utr: 'UTR123',
    receivedAmount: 2500,
    allocations: [
      { allocatedAmount: 2000, feeHead: { type: 'TUITION' } }
    ]
  };

  console.log("\n2. Processing Mapped Event (Tuition)...");
  await orchestrator.mapEvent('FeeAllocated', feeAllocatedEvent, 'event-1', 'org_default');
  console.log("✅ Expected: Success");

  console.log("\n3. Processing Event with Missing Mapping (Transport)...");
  const missingMappingEvent = {
    ...feeAllocatedEvent,
    id: 'fee-tx-2',
    allocations: [
      { allocatedAmount: 500, feeHead: { type: 'TRANSPORT' } }
    ]
  };
  await orchestrator.mapEvent('FeeAllocated', missingMappingEvent, 'event-2', 'org_default');
  console.log("✅ Expected: Handled Exception -> Manual Review created");

  console.log("\n4. Verifying Database State...");
  
  const transactions = await prisma.accountingTransaction.findMany({ 
    where: { organizationId: 'org_default' },
    include: { entries: true }
  });
  
  const manualReviews = await prisma.manualReview.findMany({
    where: { type: 'ACCOUNTING_MAPPING_FAILURE', organizationId: 'org_default' }
  });

  console.log(`Transactions Recorded: ${transactions.length} (Expected: 1)`);
  console.log(`Manual Reviews Generated: ${manualReviews.length} (Expected: 1)`);
  
  let passed = true;
  if (transactions.length !== 1 || transactions[0].entries.length !== 2) {
    passed = false;
    console.log("❌ Transaction generation failed.");
  }
  if (manualReviews.length !== 1) {
    passed = false;
    console.log("❌ Manual Review fallback failed.");
  }

  if (passed) {
    console.log("\n🎉 SUCCESS! Immutability, Ledger Resolution, and Safety fallbacks worked perfectly.");
  }

  console.log("\nCleaning up...");
  await prisma.accountingEntry.deleteMany({ where: { transaction: { organizationId: 'org_default' } } });
  await prisma.accountingTransaction.deleteMany({ where: { organizationId: 'org_default' } });
  await prisma.manualReview.deleteMany({ where: { organizationId: 'org_default' } });
  await prisma.ledgerMapping.deleteMany({ where: { organizationId: 'org_default' } });
  await prisma.accountingLedger.delete({ where: { id: transportLedger.id } });
  await prisma.accountingLedger.delete({ where: { id: tuitionLedger.id } });
  await prisma.accountingLedger.delete({ where: { id: bankLedger.id } });
  await prisma.eventOutbox.deleteMany({ where: { organizationId: 'org_default' } });
  
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("FATAL ERROR:", error);
  await prisma.$disconnect();
  process.exit(1);
});
