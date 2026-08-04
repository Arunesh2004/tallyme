import { Test, TestingModule } from '@nestjs/testing';
import { ProcessERPSyncUseCase } from './process-erp-sync.use-case';
import { LoggerService } from '../../../core/logger/logger.service';
import { ERP_REPOSITORY, VOUCHER_REPOSITORY } from '../constants/erp.constants';
import { QUEUE_PROVIDER } from '../../../infrastructure/queue/queue.constants';
import { ERPConnectorEngine } from '../services/connector.engine';
import { ERPRetryService } from '../services/retry.service';
import { AccountingPeriodService } from '../../accounting-policy/services/accounting-period.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { TallyMasterValidationEngine } from '../../accounting-intelligence/validation/tally-master-validation.engine';
import { ApprovalWorkflowEngine } from '../../accounting-intelligence/governance/approval-workflow.engine';
import { AccountingDecisionAuditService } from '../../accounting-intelligence/decision-audit/accounting-decision-audit.service';
import { TallyMasterIntelligenceService } from '../services/tally-master-intelligence.service';
import { AuditService } from '../../audit/audit.service';
import { MasterGroupResolverService } from '../../accounting-intelligence/governance/master-group-resolver.service';

describe('ProcessERPSyncUseCase', () => {
  let useCase: ProcessERPSyncUseCase;
  let repository: any;
  let voucherRepository: any;
  let engine: any;
  let queue: any;
  let prisma: any;
  let periodService: any;
  let retryService: any;
  let tallyMasterValidationEngine: any;

  beforeEach(async () => {
    repository = {
      createSyncJob: jest.fn(),
      findJobByIdempotencyHash: jest.fn(),
      updateJobStatus: jest.fn(),
      findJobById: jest.fn(),
      logAttempt: jest.fn(),
    };
    voucherRepository = {
      findById: jest.fn(),
    };
    engine = {
      verifyVoucherExists: jest.fn(),
      syncVoucher: jest.fn(),
    };
    queue = {};
    prisma = {
      voucherCandidate: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      batchSyncItem: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      tallyDiscoveryReport: {
        findFirst: jest.fn(),
      },
      discoveryLedger: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };
    periodService = {
      validatePostingAllowed: jest.fn(),
    };
    retryService = {
      shouldRetry: jest.fn().mockReturnValue({ shouldRetry: false, delayMs: 0 }),
      isExhausted: jest.fn().mockReturnValue(false),
      getMaxAttempts: jest.fn().mockReturnValue(3),
    };
    tallyMasterValidationEngine = {
      validate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessERPSyncUseCase,
        { provide: ERP_REPOSITORY, useValue: repository },
        { provide: VOUCHER_REPOSITORY, useValue: voucherRepository },
        { provide: ERPConnectorEngine, useValue: engine },
        { provide: QUEUE_PROVIDER, useValue: queue },
        { provide: LoggerService, useValue: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } },
        { provide: PrismaService, useValue: prisma },
        { provide: AccountingPeriodService, useValue: periodService },
        { provide: ERPRetryService, useValue: retryService },
        { provide: TallyMasterValidationEngine, useValue: tallyMasterValidationEngine },
        { provide: ApprovalWorkflowEngine, useValue: { createApprovalRequest: jest.fn() } },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: AccountingDecisionAuditService, useValue: { logDecision: jest.fn() } },
        { provide: TallyMasterIntelligenceService, useValue: { ensureLedger: jest.fn() } },
        { provide: MasterGroupResolverService, useValue: { resolvePartyGroup: jest.fn(), resolveExpenseGroup: jest.fn(), resolveTaxGroup: jest.fn() } },
      ],
    }).compile();

    useCase = module.get<ProcessERPSyncUseCase>(ProcessERPSyncUseCase);
  });

  describe('createJob', () => {
    it('should create a sync job', async () => {
      repository.createSyncJob.mockResolvedValue({ id: 'job-1', status: 'PENDING' });
      const job = await useCase.createJob('voucher-1');
      expect(job.id).toBe('job-1');
      expect(repository.createSyncJob).toHaveBeenCalled();
    });

    it('should reset job if already exists in failed state', async () => {
      repository.createSyncJob.mockRejectedValue({ code: 'P2002' });
      repository.findJobByIdempotencyHash.mockResolvedValue({ id: 'job-1', status: 'FAILED_PERMANENT', attempts: 3 });
      const job = await useCase.createJob('voucher-1');
      expect(job.status).toBe('PENDING');
      expect(repository.updateJobStatus).toHaveBeenCalledWith('job-1', 'PENDING', expect.any(Object));
    });
  });

  describe('execute', () => {
    it('should skip if job not found', async () => {
      repository.findJobById.mockResolvedValue(null);
      await useCase.execute('job-1', 1);
      expect(voucherRepository.findById).not.toHaveBeenCalled();
    });

    it('should skip if job is in terminal state', async () => {
      repository.findJobById.mockResolvedValue({ id: 'job-1', status: 'SYNCED' });
      await useCase.execute('job-1', 1);
      expect(voucherRepository.findById).not.toHaveBeenCalled();
    });

    it('should fail if voucher not found', async () => {
      repository.findJobById.mockResolvedValue({ id: 'job-1', status: 'PENDING', voucherCandidateId: 'v1' });
      voucherRepository.findById.mockResolvedValue(null);
      await useCase.execute('job-1', 1);
      expect(repository.updateJobStatus).toHaveBeenCalledWith('job-1', 'FAILED_PERMANENT', expect.any(Object));
    });

    it('should sync successfully if voucher passes validation', async () => {
      repository.findJobById.mockResolvedValue({ id: 'job-1', status: 'PENDING', voucherCandidateId: 'v1', adapterCode: 'TALLY' });
      voucherRepository.findById.mockResolvedValue({ id: 'v1' });
      prisma.voucherCandidate.findUnique.mockResolvedValue({
        id: 'v1',
        voucherType: 'Purchase',
        companyId: 'c1',
        date: new Date(),
        entries: [],
      });
      tallyMasterValidationEngine.validate.mockResolvedValue({ valid: true });
      periodService.validatePostingAllowed.mockResolvedValue(undefined);
      engine.verifyVoucherExists.mockResolvedValue('NOT_FOUND');
      engine.syncVoucher.mockResolvedValue({ success: true, referenceId: 'VCHNO:123' });

      await useCase.execute('job-1', 1);

      expect(engine.syncVoucher).toHaveBeenCalled();
      expect(repository.updateJobStatus).toHaveBeenCalledWith('job-1', 'SYNCED', expect.objectContaining({ erpReferenceId: 'VCHNO:123' }));
    });
  });
});
