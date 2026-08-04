import { Test, TestingModule } from '@nestjs/testing';
import { VoucherWorker } from './voucher.worker';
import { ProcessVoucherBuilderUseCase } from '../use-cases/process-voucher-builder.use-case';
import { LoggerService } from '../../../core/logger/logger.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrometheusService } from '../../../shared/observability/metrics/prometheus.service';
import { OpenTelemetryTracer } from '../../../shared/observability/tracing/opentelemetry.tracer';
import { AuditService } from '../../audit/audit.service';
import { AccountingPeriodService } from '../../accounting-policy/services/accounting-period.service';

describe('VoucherWorker', () => {
  let worker: VoucherWorker;
  let useCase: any;
  let prismaService: any;
  let loggerService: any;

  beforeEach(async () => {
    useCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    };
    prismaService = {
      transactionDraft: {
        findUnique: jest.fn(),
      },
    };
    loggerService = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };
    const mockPrometheus = {
      voucherBuildSeconds: { startTimer: jest.fn().mockReturnValue(jest.fn()) },
    };
    const mockTracer = {
      startActiveSpan: jest.fn().mockImplementation(async (name, fn) => {
        return await fn({ end: jest.fn() });
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoucherWorker,
        { provide: ProcessVoucherBuilderUseCase, useValue: useCase },
        { provide: PrismaService, useValue: prismaService },
        { provide: LoggerService, useValue: loggerService },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: PrometheusService, useValue: mockPrometheus },
        { provide: OpenTelemetryTracer, useValue: mockTracer },
        { provide: AccountingPeriodService, useValue: { validatePostingAllowed: jest.fn() } },
      ],
    }).compile();

    worker = module.get<VoucherWorker>(VoucherWorker);
  });

  describe('process', () => {
    it('should throw error if payload misses draftId', async () => {
      const job = { id: 'job-2', data: { candidateId: 'leg-1' } } as any;

      await expect(worker.process(job)).rejects.toThrow('Invalid payload: missing draftId');
      expect(useCase.execute).not.toHaveBeenCalled();
    });

    it('should process draft payload correctly', async () => {
      const draftPayload = {
        header: { type: 'EXPENSE', tenantId: 'tenant-1', invoiceNumber: 'INV-01' },
        ledgerEntries: [
          { isDebit: true, ledgerName: 'Rent', amount: 100 },
          { isDebit: false, ledgerName: 'Vendor', amount: 100, isParty: true },
        ],
        metadata: {},
      };
      prismaService.transactionDraft.findUnique.mockResolvedValue({
        id: 'draft-1',
        payload: draftPayload,
      });

      const job = { id: '2', data: { draftId: 'draft-1' } } as any;
      await worker.process(job);

      expect(prismaService.transactionDraft.findUnique).toHaveBeenCalledWith({
        where: { id: 'draft-1' },
      });
      expect(useCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          voucherType: 'PURCHASE',
          candidateId: 'draft-1',
          companyId: 'tenant-1',
        }),
      );
    });

    it('should throw error if draft not found', async () => {
      prismaService.transactionDraft.findUnique.mockResolvedValue(null);
      const job = { id: '3', data: { draftId: 'missing-draft' } } as any;

      await expect(worker.process(job)).rejects.toThrow('Draft missing-draft not found');
      expect(loggerService.error).toHaveBeenCalled();
    });
  });
});
