import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { getQueueToken } from '@nestjs/bullmq';
import { OutboxRelayWorker } from '../src/modules/universal-transaction/workers/outbox-relay.worker';
import { ProcessERPSyncUseCase } from '../src/modules/erp-connector/use-cases/process-erp-sync.use-case';

describe('Resilience (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtToken: string;
  let outboxRelay: OutboxRelayWorker;

  const mockVoucherQueue = {
    add: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getQueueToken('voucher-generation'))
      .useValue(mockVoucherQueue)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    outboxRelay = moduleFixture.get<OutboxRelayWorker>(OutboxRelayWorker);
    const jwtService = moduleFixture.get<JwtService>(JwtService);
    
    jwtToken = jwtService.sign({
      id: 'test-admin',
      sub: 'test-admin',
      roles: ['ACCOUNTING_ADMIN', 'APPROVAL_ADMIN'],
      organizationId: 'company-1',
    });
  });

  afterAll(async () => {
    await prisma.transactionDraft.deleteMany({ where: { tenantId: 'company-1' } });
    await prisma.voucherCandidate.deleteMany({ where: { companyId: 'company-1' } });
    await app.close();
  });

  it('1. Database transaction failure simulates rollback cleanly', async () => {
    const payload = {
      header: {
        tenantId: 'company-1',
        transactionDate: new Date().toISOString(),
        type: 'EXPENSE',
        invoiceNumber: `INV-DB-FAIL-${Date.now()}`,
      },
      ledgerEntries: [
        { ledgerName: 'Consulting', amount: 100, isDebit: true },
        { ledgerName: 'Vendor', amount: 100, isDebit: false, isParty: true }
      ],
      parties: { vendorId: 'v-1' }
    };

    // Force failure by providing invalid data type intentionally that passes validation but fails Prisma
    payload.ledgerEntries[0].amount = -99999999999999999999 as any; 
    
    const res = await request(app.getHttpServer())
      .post('/api/v2/transactions/drafts')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('Idempotency-Key', `test-db-fail-${Date.now()}`)
      .send(payload);

    expect(res.status).toBe(500);

    const draft = await prisma.transactionDraft.findFirst({
      where: { 'payload': { path: ['header', 'invoiceNumber'], equals: payload.header.invoiceNumber } }
    });
    expect(draft).toBeNull();
  });

  it('2. Queue failure simulates graceful error handling (TransactionOutbox FAILED)', async () => {
    const payload = {
      header: {
        tenantId: 'company-1',
        transactionDate: new Date().toISOString(),
        type: 'EXPENSE',
        invoiceNumber: `INV-Q-FAIL-${Date.now()}`,
      },
      ledgerEntries: [
        { ledgerName: 'Consulting', amount: 100, isDebit: true },
        { ledgerName: 'Vendor', amount: 100, isDebit: false, isParty: true }
      ],
      parties: { vendorId: 'v-1' }
    };

    const createRes = await request(app.getHttpServer())
      .post('/api/v2/transactions/drafts')
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('Idempotency-Key', `test-q-fail-${Date.now()}`)
      .send(payload)
      .expect(201);
      
    const draftId = createRes.body.id;

    await request(app.getHttpServer())
      .post(`/api/v2/transactions/drafts/${draftId}/approve`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .set('Idempotency-Key', `test-q-app-${Date.now()}`)
      .send({ reason: 'Looks good' })
      .expect(200);

    // Mock BullMQ enqueue failure
    mockVoucherQueue.add.mockRejectedValueOnce(new Error('Redis connection lost'));

    await outboxRelay.processPendingEvents();

    const outboxEvent = await prisma.transactionOutbox.findFirst({
      where: { aggregateId: draftId, eventType: 'DRAFT_APPROVED' }
    });
    expect(outboxEvent?.status).toBe('FAILED');
    expect(outboxEvent?.retryCount).toBe(1);
  });

  it('3. ERP timeout returns temporary failure without duplicate voucher creation', async () => {
    const voucher = await prisma.voucherCandidate.create({
      data: {
        companyId: 'company-1',
        voucherNumber: `VCH-TMO-${Date.now()}`,
        voucherType: 'Journal',
        date: new Date(),
        status: 'PROCESSING',
      }
    });

    const syncJob = await prisma.eRPSyncJob.create({
      data: {
        voucherCandidateId: voucher.id,
        status: 'PENDING',
        idempotencyHash: `hash-${Date.now()}`,
        adapterCode: 'TALLY_PRIME_V1'
      }
    });

    const useCase = app.get<ProcessERPSyncUseCase>(ProcessERPSyncUseCase);
    
    // Create a mock inside the usecase for this specific call
    const useCaseProto = Object.getPrototypeOf(useCase);
    const originalTransport = (useCase as any)['transportService'];
    (useCase as any)['transportService'] = {
      send: jest.fn().mockRejectedValue(new Error('ETIMEDOUT')),
    } as any;

    try {
      await useCase.execute(syncJob.id, 1);
    } catch (e) {
      // Expected BullMQ error bubble up
    }

    // Restore original transport
    (useCase as any)['transportService'] = originalTransport;

    const updatedJob = await prisma.eRPSyncJob.findUnique({ where: { id: syncJob.id } });
    
    // Status must not be SYNCED, it should remain in some recoverable/retrying state
    expect(['PENDING', 'FAILED_TEMPORARY', 'SYNCING']).toContain(updatedJob?.status);

    // Verify no duplicate voucher creation by checking count
    const voucherCount = await prisma.voucherCandidate.count({
      where: { voucherNumber: voucher.voucherNumber }
    });
    expect(voucherCount).toBe(1); // Still only 1
  });
});
