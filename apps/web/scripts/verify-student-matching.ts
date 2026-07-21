import 'dotenv/config';
import { prisma } from '../shared/db/prisma';
import { MatchingOrchestrator } from '../modules/student-fees/matching/services/MatchingOrchestrator';
import { ParsedPayment } from '../modules/student-fees/matching/strategies/WeightedMatchingStrategy';

async function main() {
  console.log("=========================================================");
  console.log("STUDENT MATCHING ENGINE VERIFICATION");
  console.log("=========================================================\n");

  const orchestrator = new MatchingOrchestrator();

  console.log("1. Seeding Mock Student Data...");
  const feeStructure = await prisma.feeStructure.create({
    data: {
      name: 'Class 10 Regular',
      tuitionFee: 2000,
      computerFee: 500,
      organizationId: 'org_default'
    }
  });

  const student = await prisma.studentProfile.create({
    data: {
      admissionNumber: 'ADM-2026-001',
      studentName: 'John Doe',
      class: '10',
      academicSession: '2026-2027',
      feeStructureId: feeStructure.id,
      organizationId: 'org_default'
    }
  });

  console.log(`✅ Seeded Student: ${student.studentName} (${student.admissionNumber})`);

  console.log("\n2. Processing Payment (Exact Match)...");
  const perfectPayment: ParsedPayment = {
    admissionNumber: 'ADM-2026-001',
    studentName: 'John Doe',
    utr: 'UTR123456789',
    amount: 2500,
    feeMonth: 'APRIL-2026',
    gateway: 'HDFC'
  };

  await orchestrator.processPayment(perfectPayment);
  console.log("✅ Expected: StudentMatched Event emitted.");

  console.log("\n3. Processing Payment (Overpayment Discrepancy)...");
  const overPayment: ParsedPayment = {
    admissionNumber: 'ADM-2026-001',
    utr: 'UTR999999999',
    amount: 3000, // Expected is 2500
    feeMonth: 'MAY-2026',
    gateway: 'HDFC'
  };

  await orchestrator.processPayment(overPayment);
  console.log("✅ Expected: ManualReviewCreated Event (OVERPAYMENT) emitted.");

  console.log("\n4. Processing Payment (Duplicate Detection)...");
  // Exact same fingerprint as the perfectPayment
  await orchestrator.processPayment(perfectPayment);
  console.log("✅ Expected: DuplicatePaymentDetected Event emitted.");

  console.log("\n5. Verifying Database State...");
  
  const manualReviews = await prisma.manualReview.findMany({ where: { organizationId: 'org_default' } });
  const outboxEvents = await prisma.eventOutbox.findMany({ where: { organizationId: 'org_default' } });

  console.log(`Manual Reviews Generated: ${manualReviews.length}`);
  console.log(`Outbox Events Generated: ${outboxEvents.length}`);
  
  if (outboxEvents.length === 3) {
    console.log("\n🎉 SUCCESS! The Matching Engine correctly routed perfect matches, anomalies, and duplicates.");
  } else {
    console.log("\n❌ FAILURE! Event counts do not match expected outcomes.");
  }

  console.log("\nCleaning up...");
  await prisma.eventOutbox.deleteMany({ where: { organizationId: 'org_default' } });
  await prisma.manualReview.deleteMany({ where: { organizationId: 'org_default' } });
  await prisma.studentProfile.delete({ where: { id: student.id } });
  await prisma.feeStructure.delete({ where: { id: feeStructure.id } });
  
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("FATAL ERROR:", error);
  await prisma.$disconnect();
  process.exit(1);
});
