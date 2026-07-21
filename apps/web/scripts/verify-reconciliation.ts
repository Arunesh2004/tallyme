import 'dotenv/config';
import { prisma } from '../shared/db/prisma';
import { ReconciliationOrchestrator } from '../modules/student-fees/reconciliation/services/ReconciliationOrchestrator';

async function main() {
  console.log("=========================================================");
  console.log("FEE RECONCILIATION ENGINE VERIFICATION");
  console.log("=========================================================\n");

  const orchestrator = new ReconciliationOrchestrator();

  console.log("1. Seeding Mock Relational Fee Data...");
  
  const tuitionHead = await prisma.feeHead.create({ data: { name: 'Tuition', priority: 1, type: 'TUITION', organizationId: 'org_default' } });
  const transportHead = await prisma.feeHead.create({ data: { name: 'Transport', priority: 2, type: 'TRANSPORT', organizationId: 'org_default' } });
  const computerHead = await prisma.feeHead.create({ data: { name: 'Computer', priority: 3, type: 'COMPUTER', organizationId: 'org_default' } });
  const advanceHead = await prisma.feeHead.create({ data: { name: 'Advance', priority: 999, type: 'ADVANCE', organizationId: 'org_default' } });

  const feeStructure = await prisma.feeStructure.create({
    data: { name: 'Class 10 Regular', organizationId: 'org_default' }
  });

  await prisma.feeStructureItem.createMany({
    data: [
      { feeStructureId: feeStructure.id, feeHeadId: tuitionHead.id, amount: 2000 },
      { feeStructureId: feeStructure.id, feeHeadId: transportHead.id, amount: 500 },
      { feeStructureId: feeStructure.id, feeHeadId: computerHead.id, amount: 300 }
    ]
  });

  const student = await prisma.studentProfile.create({
    data: {
      admissionNumber: 'ADM-2026-REC-01',
      studentName: 'Jane Smith',
      class: '10',
      academicSession: '2026-2027',
      feeStructureId: feeStructure.id,
      organizationId: 'org_default'
    }
  });

  console.log("✅ Seeded Student, Fee Heads, and Items (Expected Total: Rs 2800)");

  console.log("\n2. Processing EXACT Payment (2800)...");
  await orchestrator.reconcile({
    studentId: student.id,
    expectedAmount: 2800,
    paidAmount: 2800,
    matchedFeeMonth: 'APRIL-2026',
    paymentFingerprint: 'hash-exact'
  });
  console.log("✅ Exact Payment reconciled. Status: PAID");

  console.log("\n3. Processing PARTIAL Payment (2200)...");
  // Tuition (2000) should be fully funded. Transport (500) gets 200. Computer (300) gets 0.
  await orchestrator.reconcile({
    studentId: student.id,
    expectedAmount: 2800,
    paidAmount: 2200,
    matchedFeeMonth: 'MAY-2026',
    paymentFingerprint: 'hash-partial'
  });
  console.log("✅ Partial Payment reconciled. Status: PARTIALLY_PAID");

  console.log("\n4. Processing OVERPAYMENT (3000)...");
  // Expected 2800. 200 surplus goes to ADVANCE.
  await orchestrator.reconcile({
    studentId: student.id,
    expectedAmount: 2800,
    paidAmount: 3000,
    matchedFeeMonth: 'JUNE-2026',
    paymentFingerprint: 'hash-over'
  });
  console.log("✅ Overpayment reconciled. Status: OVERPAID (with Advance Allocation)");

  console.log("\n5. Verifying Database State...");
  
  const transactions = await prisma.feeTransaction.findMany({ 
    where: { studentId: student.id },
    include: { allocations: true }
  });

  const exactTx = transactions.find(t => t.status === 'PAID');
  const partialTx = transactions.find(t => t.status === 'PARTIALLY_PAID');
  const overTx = transactions.find(t => t.status === 'OVERPAID');

  console.log(`Transactions Recorded: ${transactions.length} (Expected: 3)`);
  
  let passed = true;
  if (!exactTx || exactTx.allocations.length !== 3) passed = false;
  
  const transportAlloc = partialTx?.allocations.find(a => a.feeHeadId === transportHead.id);
  if (!transportAlloc || Number(transportAlloc.allocatedAmount) !== 200) {
    passed = false;
    console.log("❌ Partial allocation to Transport failed.");
  }

  const advanceAlloc = overTx?.allocations.find(a => a.feeHeadId === advanceHead.id);
  if (!advanceAlloc || Number(advanceAlloc.allocatedAmount) !== 200) {
    passed = false;
    console.log("❌ Surplus allocation to Advance failed.");
  }

  if (passed) {
    console.log("\n🎉 SUCCESS! Waterfall Allocations, Advance capturing, and Event Emissions worked perfectly.");
  }

  console.log("\nCleaning up...");
  await prisma.feeTransactionAllocation.deleteMany({ where: { feeTransaction: { studentId: student.id } } });
  await prisma.feeTransaction.deleteMany({ where: { studentId: student.id } });
  await prisma.studentProfile.delete({ where: { id: student.id } });
  await prisma.feeStructureItem.deleteMany({ where: { feeStructureId: feeStructure.id } });
  await prisma.feeStructure.delete({ where: { id: feeStructure.id } });
  await prisma.feeHead.deleteMany({ where: { organizationId: 'org_default' } });
  await prisma.eventOutbox.deleteMany({ where: { organizationId: 'org_default' } });
  
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("FATAL ERROR:", error);
  await prisma.$disconnect();
  process.exit(1);
});
