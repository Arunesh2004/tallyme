import { Test, TestingModule } from '@nestjs/testing';
import { ERPReconciliationWorker } from './erp-reconciliation.worker';
import { PrismaERPRepository } from '../repositories/prisma-erp.repository';
import { TallyTransportService } from '../services/transport.service';
import { TransactionOutboxRepository } from '../../universal-transaction/repositories/transaction-outbox.repository';
import { ERPSyncStatus } from '@prisma/client';
import { ERP_REPOSITORY } from '../constants/erp.constants';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { TallyXmlBuilderService } from '../services/xml-builder.service';
import { PrometheusService } from '../../../shared/observability/metrics/prometheus.service';

import { DistributedLockService } from '../../../shared/redis/distributed-lock.service';

describe('ERPReconciliationWorker', () => {
  let worker: ERPReconciliationWorker;
  let erpRepo: jest.Mocked<PrismaERPRepository>;
  let outboxRepo: jest.Mocked<TransactionOutboxRepository>;
  let transport: jest.Mocked<TallyTransportService>;
  let testingModule: TestingModule;

  beforeEach(async () => {
    const mockErpRepo = {
      findStrandedSyncJobs: jest.fn(),
      updateJobStatus: jest.fn(),
    };
    const mockOutboxRepo = {
      createEvent: jest.fn(),
    };
    const mockTransport = {
      send: jest.fn(),
    };
    const mockPrisma = {
      voucherCandidate: {
        findUnique: jest.fn(),
      }
    };
    const mockXmlBuilder = {
      buildExportXml: jest.fn(),
    };
    const mockPrometheus = {
      reconciliationTotal: { inc: jest.fn() },
      cronLockAcquiredTotal: { inc: jest.fn() },
      cronLockContentionTotal: { inc: jest.fn() },
      cronLockFailedTotal: { inc: jest.fn() },
    };
    const mockLockService = {
      acquireLock: jest.fn().mockResolvedValue(true),
      releaseLock: jest.fn().mockResolvedValue(true),
    };

    testingModule = await Test.createTestingModule({
      providers: [
        ERPReconciliationWorker,
        { provide: ERP_REPOSITORY, useValue: mockErpRepo },
        { provide: TransactionOutboxRepository, useValue: mockOutboxRepo },
        { provide: TallyTransportService, useValue: mockTransport },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TallyXmlBuilderService, useValue: mockXmlBuilder },
        { provide: PrometheusService, useValue: mockPrometheus },
        { provide: DistributedLockService, useValue: mockLockService },
      ],
    }).compile();

    worker = testingModule.get<ERPReconciliationWorker>(ERPReconciliationWorker);
    erpRepo = testingModule.get(ERP_REPOSITORY);
    outboxRepo = testingModule.get(TransactionOutboxRepository);
    transport = testingModule.get(TallyTransportService);
  });

  it('should reconcile job as SYNCED if found in ERP', async () => {
    erpRepo.findStrandedSyncJobs.mockResolvedValue([
      { id: 'job1', voucherCandidateId: 'v1', attempts: 3, erpReferenceId: 'ref1' }
    ]);
    const prismaService = testingModule.get(PrismaService);
    (prismaService.voucherCandidate.findUnique as jest.Mock).mockResolvedValue({ voucherNumber: 'VOUCHER-123' });
    
    const xmlBuilder = testingModule.get(TallyXmlBuilderService);
    (xmlBuilder.buildExportXml as jest.Mock).mockResolvedValue('<EXPORT></EXPORT>');
    
    transport.send.mockResolvedValue({ success: true, rawResponse: '<VOUCHER>' } as any);

    await worker.handleReconciliation();

    expect(erpRepo.updateJobStatus).toHaveBeenCalledWith('job1', ERPSyncStatus.SYNCED, expect.any(Object));
    expect(outboxRepo.createEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'ERP_SYNC_COMPLETED',
      aggregateId: 'v1'
    }));
  });

  it('should return job to PENDING if not found in ERP', async () => {
    erpRepo.findStrandedSyncJobs.mockResolvedValue([
      { id: 'job2', voucherCandidateId: 'v2', attempts: 1 }
    ]);
    const prismaService = testingModule.get(PrismaService);
    (prismaService.voucherCandidate.findUnique as jest.Mock).mockResolvedValue({ voucherNumber: 'VOUCHER-456' });
    
    const xmlBuilder = testingModule.get(TallyXmlBuilderService);
    (xmlBuilder.buildExportXml as jest.Mock).mockResolvedValue('<EXPORT></EXPORT>');
    
    transport.send.mockResolvedValue({ success: true, rawResponse: '<NO_VOUCHER>' } as any);

    await worker.handleReconciliation();

    expect(erpRepo.updateJobStatus).toHaveBeenCalledWith('job2', ERPSyncStatus.PENDING, expect.any(Object));
    expect(outboxRepo.createEvent).not.toHaveBeenCalled();
  });

  it('should preserve SYNCING state if ERP is unreachable', async () => {
    erpRepo.findStrandedSyncJobs.mockResolvedValue([
      { id: 'job3', voucherCandidateId: 'v3', attempts: 1 }
    ]);
    const prismaService = testingModule.get(PrismaService);
    (prismaService.voucherCandidate.findUnique as jest.Mock).mockResolvedValue({ voucherNumber: 'VOUCHER-789' });
    
    const xmlBuilder = testingModule.get(TallyXmlBuilderService);
    (xmlBuilder.buildExportXml as jest.Mock).mockResolvedValue('<EXPORT></EXPORT>');
    
    transport.send.mockResolvedValue({ success: false, httpStatus: 504 } as any);

    await worker.handleReconciliation();

    // It should not update the job status
    expect(erpRepo.updateJobStatus).not.toHaveBeenCalled();
    expect(outboxRepo.createEvent).not.toHaveBeenCalled();
  });
});
