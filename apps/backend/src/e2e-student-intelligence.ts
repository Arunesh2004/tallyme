import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';
import { PrismaService } from './infrastructure/database/prisma.service';
import { StudentPaymentExtractor } from './modules/payment-parser/services/student-payment.extractor';
import { StudentMatchingService } from './modules/student-matching/services/student-matching.service';
import { FeeAllocationService } from './modules/student-fee/domain/services/fee-allocation.service';
import { StudentVoucherOrchestrator } from './modules/student-fee/domain/services/student-voucher.orchestrator';
import { TallyTransportService } from './modules/erp-connector/services/transport.service';

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runE2E() {
  console.log('🚀 Starting Student Intelligence E2E Trace...');

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
    providers: [
      StudentPaymentExtractor,
      StudentMatchingService,
      FeeAllocationService,
      {
        provide: TallyTransportService,
        useValue: { checkHealth: async () => true },
      },
    ],
  }).compile();

  const app = moduleFixture.createNestApplication();
  await app.init();

  const prisma = app.get(PrismaService);
  const extractor = app.get(StudentPaymentExtractor);
  const matcher = app.get(StudentMatchingService);
  const allocator = app.get(FeeAllocationService);
  const orchestrator = app.get(StudentVoucherOrchestrator);

  try {
    // 1. Seed Ledgers
    await prisma.voucherLedger.upsert({
      where: { name: 'Bank Account' },
      update: {},
      create: { name: 'Bank Account' },
    });
    await prisma.voucherLedger.upsert({
      where: { name: 'Fee Collection' },
      update: {},
      create: { name: 'Fee Collection' },
    });

    // 2. Student CSV Import Simulation
    console.log('\n--- Phase 1: Student Master Import ---');
    const student = await prisma.student.upsert({
      where: { admissionNumber: 'ADM9999' },
      update: {},
      create: {
        enrollmentNo: 'ADM9999',
        admissionNumber: 'ADM9999',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '1234567890',
        class: '10',
        section: 'A',
        academicYear: '2023-2024',
      },
    });
    console.log(`✅ Student Record Created: ${student.id} (ADM9999)`);

    // 3. Payment Email Injection
    console.log('\n--- Phase 2: Gmail Ingestion (Stubbed) ---');
    const emailDoc = await prisma.emailDocument.create({
      data: {
        messageId: `msg-${Date.now()}`,
        source: 'GMAIL',
        checksum: 'fake-checksum',
        receivedAt: new Date(),
        status: 'RECEIVED',
      },
    });
    console.log(`✅ Email Document Injected: ${emailDoc.id}`);
    const emailBody = `
      Razorpay Payment Confirmation
      Txn ID: pay_XYZ987654321
      Amount: INR 1,500.00
      Student ID: ADM9999
      Name: John Doe
    `;

    // 4. Payment Extraction
    console.log('\n--- Phase 3: Payment Extraction ---');
    const candidate = await extractor.extract(emailDoc.id, emailBody);
    console.log(`✅ Extraction Complete. Candidate ID: ${candidate.id}`);
    console.log(
      `   Amount: ${candidate.amount}, Gateway: ${candidate.paymentGateway}`,
    );

    // 5. Student Matching
    console.log('\n--- Phase 4: Student Matching ---');
    const match = await matcher.match(candidate.id);
    console.log(
      `✅ Matched Student ID: ${match.studentId} via Strategy: ${match.strategy} (Confidence: ${match.confidence})`,
    );

    // 6. Fee Allocation
    console.log('\n--- Phase 5: Fee Allocation ---');
    // Ensure outstanding fee exists
    await prisma.outstandingFee.create({
      data: {
        studentId: student.id,
        amountPaid: 0,
        isPaid: false,
      },
    });
    const allocation = await allocator.allocate(candidate.id);
    console.log(
      `✅ Fee Allocated. Candidate ID: ${allocation.allocationCandidateId}`,
    );

    // 7. Orchestration & Shared Accounting Engine
    console.log('\n--- Phase 6: Orchestrating to VoucherBuilder ---');
    // (implementation note)
    const result = await orchestrator.orchestrate(
      [
        {
          outstandingFeeId: 'Fee Collection',
          allocatedAmount: {
            amount: { toNumber: () => candidate.amount } as any,
          } as any,
        },
      ] as any,
      'Bank Account',
      'Student Name',
      'REF123',
      'COMP-1',
    );
    console.log(`✅ Dispatched to VOUCHER_BUILDER_QUEUE:`, result);

    console.log('\n--- Phase 7: Waiting for Queue Workers ---');
    await delay(3000); // Wait for bullmq workers to pick up

    // 8. Verification
    const job = await prisma.eRPSyncJob.findFirst({
      orderBy: { createdAt: 'desc' },
      include: { voucherCandidate: true },
    });

    if (job) {
      console.log(`✅ ERP Sync Job Discovered: ${job.id}`);
      console.log(`   Voucher Candidate: ${job.voucherCandidate.id}`);
      console.log(`   Sync Status: ${job.status}`);

      // Link the fee allocation to the voucher candidate for the monitor API
      await prisma.feeAllocationCandidate.update({
        where: { id: allocation.allocationCandidateId },
        data: { voucherCandidateId: job.voucherCandidate.id },
      });
      console.log(
        `✅ Successfully bound Intelligence Layer to Accounting Layer.`,
      );
    } else {
      console.log(`❌ ERP Sync Job Not Found!`);
    }
  } catch (error: any) {
    console.error('❌ E2E Failed:', error);
  } finally {
    await app.close();
  }
}

runE2E();
