import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../../../src/core/logger/logger.service';
import { PrismaService } from '../../../../src/infrastructure/database/prisma.service';
import { FakeStudentFeeRepository } from './fake-student-fee.repository';
import { StudentFeeOrchestrator } from '../application/orchestrators/student-fee.orchestrator';
import {
  FakeEmailParser,
  FakePaymentExtractionProvider,
  FakeStudentMatcher,
  FakeOutstandingFeeProvider,
  FakeFeeAllocator,
} from '../infrastructure/providers/fake-student-fee.providers';
import {
  VoucherBuilder,
  VoucherValidator,
} from '../../vendor-slip/domain/services/voucher.service';
import { PrismaStudentFeeRepository } from '../infrastructure/repositories/prisma-student-fee.repository';

class FakeGmailHistoryProvider {
  async syncHistory() {
    return [];
  }
  async fetchEmailContent(messageId: string) {
    return `Email content for ${messageId}`;
  }
}

describe('Student Fee Automation Pipeline Integration', () => {
  let orchestrator: StudentFeeOrchestrator;
  let prisma: PrismaService;
  let repo: FakeStudentFeeRepository;

  beforeEach(async () => {
    const mockPrismaService = {
      company: { findFirst: jest.fn().mockResolvedValue({ id: 'comp-1' }) },
      eRPSyncJob: {
        create: jest.fn(),
        deleteMany: jest.fn(),
        findFirst: jest.fn(),
      },
      voucherCandidate: {
        create: jest.fn().mockResolvedValue({ id: 'vc-student-1' }),
        deleteMany: jest.fn(),
        findUnique: jest.fn(),
      },
    } as any;

    prisma = mockPrismaService;
    repo = new FakeStudentFeeRepository();

    const emailParser = new FakeEmailParser();
    const paymentExtractor = new FakePaymentExtractionProvider();
    const studentMatcher = new FakeStudentMatcher();
    const feeAllocator = new FakeFeeAllocator();
    const outstandingFeeProvider = new FakeOutstandingFeeProvider();
    const gmailProvider = new FakeGmailHistoryProvider();
    const validator = new VoucherValidator();
    const builder = new VoucherBuilder(validator);

    orchestrator = new StudentFeeOrchestrator(
      repo as any,
      emailParser,
      paymentExtractor,
      studentMatcher,
      outstandingFeeProvider,
      feeAllocator,
      gmailProvider,
      builder,
      prisma,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle duplicate Gmail notifications idempotently', async () => {
    const metadata = {
      messageId: 'msg-dup-1',
      subject: 'Payment Received',
      sender: 'gateway@bank.com',
      receivedAt: new Date(),
      source: 'GMAIL',
      checksum: 'chk123',
    };

    const docId1 = await orchestrator.handleIncomingEmail(metadata);
    const docId2 = await orchestrator.handleIncomingEmail(metadata);

    expect(docId1).toBe(docId2);
    const audits = repo.audits.filter((a) => a.documentId === docId1);
    expect(
      audits.some((a) => a.action === 'DUPLICATE_NOTIFICATION_SKIPPED'),
    ).toBe(true);
  });

  it('should successfully traverse the entire pipeline for EXACT payment', async () => {
    const docId = await orchestrator.handleIncomingEmail({
      messageId: 'msg-exact-1',
      subject: 'Payment',
      receivedAt: new Date(),
      source: 'GMAIL',
      checksum: 'chk_exact',
    });

    await orchestrator.processEmailParsing(docId);

    const doc = await repo.getEmailDocument(docId);
    expect(doc?.status).toBe('ERP_SYNCING');

    expect(prisma.eRPSyncJob.create).toHaveBeenCalled();
    expect(prisma.voucherCandidate.create).toHaveBeenCalled();
  });

  it('should process PARTIAL payment and create allocation', async () => {
    const docId = await orchestrator.handleIncomingEmail({
      messageId: 'msg-partial',
      receivedAt: new Date(),
      source: 'GMAIL',
      checksum: 'chk',
    });

    const parsed = { textBody: 'PARTIAL payment of 500' };
    await orchestrator.processPaymentExtraction(docId, parsed);

    const alloc = repo['allocations'].get(docId);
    expect(alloc?.allocationType).toBe('PARTIAL');
    expect(alloc?.totalAllocated).toBe(500);
  });

  it('should route to manual review on email parse failure', async () => {
    const docId = await orchestrator.handleIncomingEmail({
      messageId: 'msg-FAIL_PARSE',
      receivedAt: new Date(),
      source: 'GMAIL',
      checksum: 'chk',
    });

    await orchestrator.processEmailParsing(docId);

    const doc = await repo.getEmailDocument(docId);
    expect(doc?.status).toBe('MANUAL_REVIEW');
    const review = repo.getReview(docId);
    expect(review?.reason).toContain('Email parsing failed');
  });

  it('should route to manual review on low extraction confidence', async () => {
    const docId = await orchestrator.handleIncomingEmail({
      messageId: 'msg-LOW_CONF',
      receivedAt: new Date(),
      source: 'GMAIL',
      checksum: 'chk',
    });

    await orchestrator.processPaymentExtraction(docId, {
      textBody: 'LOW_CONF_EXTRACTION',
    });

    const doc = await repo.getEmailDocument(docId);
    expect(doc?.status).toBe('MANUAL_REVIEW');
  });

  it('should route to manual review on missing student match', async () => {
    const docId = await orchestrator.handleIncomingEmail({
      messageId: 'msg-FAIL_MATCH',
      receivedAt: new Date(),
      source: 'GMAIL',
      checksum: 'chk',
    });

    await orchestrator.processStudentMatching(docId, {
      rawStudentName: 'FAIL_MATCH',
    });

    const doc = await repo.getEmailDocument(docId);
    expect(doc?.status).toBe('MANUAL_REVIEW');
    const review = repo.getReview(docId);
    expect(review?.reason).toContain('Student not found');
  });

  it('should route to manual review on multiple student match', async () => {
    const docId = await orchestrator.handleIncomingEmail({
      messageId: 'msg-MULTIPLE_MATCH',
      receivedAt: new Date(),
      source: 'GMAIL',
      checksum: 'chk',
    });

    await orchestrator.processStudentMatching(docId, {
      rawStudentName: 'MULTIPLE_MATCH',
    });

    const doc = await repo.getEmailDocument(docId);
    expect(doc?.status).toBe('MANUAL_REVIEW');
    const review = repo.getReview(docId);
    expect(review?.reason).toContain('Multiple student matches found');
  });

  it('should detect duplicate payment (reconciliation) and route to manual review', async () => {
    // 1. First complete payment
    const docId1 = await orchestrator.handleIncomingEmail({
      messageId: 'msg-dup-reconcile-1',
      receivedAt: new Date(),
      source: 'GMAIL',
      checksum: 'chk',
    });

    // Process completely
    const parsed = { textBody: 'Payment for 1000' };
    await orchestrator.processPaymentExtraction(docId1, parsed);

    const doc1 = await repo.getEmailDocument(docId1);
    expect(doc1.status).toBe('ERP_SYNCING');

    // 2. Second payment comes in via different channel (e.g. Pub/Sub vs Email) but same TXN ID
    const docId2 = await orchestrator.handleIncomingEmail({
      messageId: 'msg-dup-reconcile-2',
      receivedAt: new Date(),
      source: 'PUBSUB',
      checksum: 'chk2',
    });

    // Will extract the exact same txn_789 from the FakeExtractor (default return)
    await orchestrator.processPaymentExtraction(docId2, parsed);

    const doc2 = await repo.getEmailDocument(docId2);
    expect(doc2.status).toBe('MANUAL_REVIEW');
    const review = repo.getReview(docId2);
    expect(review?.reason).toContain('Suspected duplicate payment');
  });
});
