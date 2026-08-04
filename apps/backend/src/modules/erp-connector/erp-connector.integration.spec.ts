import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../audit/audit.service';
import { ProcessERPSyncUseCase } from './use-cases/process-erp-sync.use-case';
import { VerifyERPSyncUseCase } from './use-cases/verify-erp-sync.use-case';
import { ERP_REPOSITORY, VOUCHER_REPOSITORY } from './constants/erp.constants';
import { ERPConnectorEngine } from './services/connector.engine';
import { ERPConnectionManager } from './services/connection.manager';
import { LoggerService } from '../../core/logger/logger.service';
import { QUEUE_PROVIDER } from '../../infrastructure/queue/queue.constants';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ERPTransportException } from './exceptions/erp-transport.exception';
import { TallyMasterValidationEngine } from '../accounting-intelligence/validation/tally-master-validation.engine';
import { ApprovalWorkflowEngine } from '../accounting-intelligence/governance/approval-workflow.engine';
import { AccountingDecisionAuditService } from '../accounting-intelligence/decision-audit/accounting-decision-audit.service';
import { TallyMasterIntelligenceService } from './services/tally-master-intelligence.service';
import { MasterGroupResolverService } from '../accounting-intelligence/governance/master-group-resolver.service';
import { ERPRetryService } from './services/retry.service';
import { AccountingPeriodService } from '../accounting-policy/services/accounting-period.service';

describe('ERP Connector Integration Suite', () => {
  let processUseCase: ProcessERPSyncUseCase;
  let verifyUseCase: VerifyERPSyncUseCase;

  const mockRepo = {
    findJobById: jest.fn(),
    updateJobStatus: jest.fn(),
    logAttempt: jest.fn(),
  };

  const mockVoucherRepo = {
    findById: jest.fn(),
  };

  const mockEngine = {
    syncVoucher: jest.fn(),
    verifyVoucherExists: jest.fn().mockResolvedValue('NOT_FOUND'),
  };

  const mockQueue = {};
  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const mockConnectionManager = {
    getConnectionAndAdapter: jest.fn(),
  };

  const mockValidationEngine = {
    validate: jest
      .fn()
      .mockResolvedValue({ valid: true, missingMasters: [], warnings: [] }),
  };

  const mockApprovalEngine = {
    createApprovalRequest: jest.fn(),
  };

  const mockAuditService = {
    logDecision: jest.fn(),
  };

  const mockTallyMasterIntelligence = {
    ensureLedger: jest.fn().mockResolvedValue(undefined),
  };

  const mockMasterGroupResolver = {
    resolvePartyGroup: jest.fn().mockReturnValue({
      parentGroup: 'Sundry Creditors',
      confidence: 1.0,
      reason: 'Test',
    }),
    resolveExpenseGroup: jest.fn().mockReturnValue({
      parentGroup: 'Indirect Expenses',
      confidence: 1.0,
      reason: 'Test',
    }),
    resolveTaxGroup: jest.fn().mockReturnValue({
      parentGroup: 'Duties & Taxes',
      confidence: 1.0,
      reason: 'Test',
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessERPSyncUseCase,
        VerifyERPSyncUseCase,
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: ERP_REPOSITORY, useValue: mockRepo },
        { provide: VOUCHER_REPOSITORY, useValue: mockVoucherRepo },
        { provide: ERPConnectorEngine, useValue: mockEngine },
        { provide: QUEUE_PROVIDER, useValue: mockQueue },
        { provide: LoggerService, useValue: mockLogger },
        {
          provide: ERPRetryService,
          useValue: {
            shouldRetry: jest.fn().mockReturnValue({ shouldRetry: true, reason: 'Retryable' }),
            scheduleRetry: jest.fn(),
            isExhausted: jest.fn().mockReturnValue(false),
            getMaxAttempts: jest.fn().mockReturnValue(5),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn((cb) => cb({})),
            batchSyncItem: { findMany: jest.fn().mockResolvedValue([]) },
            voucherCandidate: {
              findUnique: jest.fn().mockResolvedValue({
                companyId: 'comp-1',
                voucherType: 'JOURNAL',
                date: new Date(),
                entries: [],
              }),
            },
          },
        },
        {
          provide: ERPConnectionManager,
          useValue: mockConnectionManager,
        },
        {
          provide: TallyMasterValidationEngine,
          useValue: mockValidationEngine,
        },
        { provide: ApprovalWorkflowEngine, useValue: mockApprovalEngine },
        { provide: AccountingDecisionAuditService, useValue: mockAuditService },
        {
          provide: TallyMasterIntelligenceService,
          useValue: mockTallyMasterIntelligence,
        },
        {
          provide: MasterGroupResolverService,
          useValue: mockMasterGroupResolver,
        },
        {
          provide: AccountingPeriodService,
          useValue: {
            validatePostingAllowed: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    processUseCase = module.get<ProcessERPSyncUseCase>(ProcessERPSyncUseCase);
    verifyUseCase = module.get<VerifyERPSyncUseCase>(VerifyERPSyncUseCase);

    jest.clearAllMocks();
  });

  // 1. Successful synchronization
  it('should process a successful synchronization', async () => {
    mockRepo.findJobById.mockResolvedValue({
      id: 'job-1',
      status: 'PENDING',
      voucherCandidateId: 'v-1',
    });
    mockVoucherRepo.findById.mockResolvedValue({ id: 'v-1' });
    mockEngine.syncVoucher.mockResolvedValue({
      success: true,
      referenceId: 'REF-123',
      transportMetadata: { durationMs: 50 },
    });

    await processUseCase.execute('job-1', 1);

    expect(mockRepo.updateJobStatus).toHaveBeenCalledWith(
      'job-1',
      'SYNCED',
      expect.objectContaining({ statusFrom: 'SYNCING' }),
    );
  });

  // 2. Transport timeout — verifyVoucherExists returns NOT_FOUND so job goes to FAILED_TEMPORARY
  it('should handle transport timeout (FAILED_TEMPORARY when voucher not found)', async () => {
    mockRepo.findJobById.mockResolvedValue({
      id: 'job-2',
      status: 'PENDING',
      voucherCandidateId: 'v-2',
      attempts: 0,
      maxAttempts: 5,
    });
    mockVoucherRepo.findById.mockResolvedValue({ id: 'v-2' });
    const timeoutError = new ERPTransportException('Timeout', 'TIMEOUT');
    mockEngine.syncVoucher.mockRejectedValue(timeoutError);
    mockEngine.verifyVoucherExists.mockResolvedValue('NOT_FOUND');

    await expect(processUseCase.execute('job-2', 1)).rejects.toThrow('Timeout');

    expect(mockRepo.updateJobStatus).toHaveBeenCalledWith(
      'job-2',
      'FAILED_TEMPORARY',
      expect.anything(),
    );
  });

  // 3. Temporary ERP outage
  it('should handle temporary ERP outage (ECONNREFUSED)', async () => {
    mockRepo.findJobById.mockResolvedValue({
      id: 'job-3',
      status: 'PENDING',
      voucherCandidateId: 'v-3',
      attempts: 0,
      maxAttempts: 5,
    });
    mockVoucherRepo.findById.mockResolvedValue({ id: 'v-3' });
    const refuseError = new Error('Connection refused');
    (refuseError as any).code = 'ECONNREFUSED';
    mockEngine.syncVoucher.mockRejectedValue(refuseError);

    await expect(processUseCase.execute('job-3', 1)).rejects.toThrow(
      'Connection refused',
    );
    expect(mockRepo.updateJobStatus).toHaveBeenCalledWith(
      'job-3',
      'RETRY_PENDING',
      expect.objectContaining({ statusFrom: 'FAILED_TEMPORARY' }),
    );
  });

  // 4. Duplicate BullMQ delivery
  it('should ignore duplicate BullMQ delivery for SYNCED job', async () => {
    mockRepo.findJobById.mockResolvedValue({ id: 'job-4', status: 'SYNCED' });
    await processUseCase.execute('job-4', 1);
    expect(mockEngine.syncVoucher).not.toHaveBeenCalled();
  });

  // 5. Concurrent workers processing the same job
  it('should gracefully handle concurrent mutations', async () => {
    mockRepo.findJobById.mockResolvedValue({
      id: 'job-5',
      status: 'PENDING',
      voucherCandidateId: 'v-5',
    });
    mockVoucherRepo.findById.mockResolvedValue({ id: 'v-5' });

    // Simulate conditional update failure
    const concurrentError = new Error('Concurrent mutation race detected');
    concurrentError.name = 'ConcurrentMutationException';
    mockRepo.updateJobStatus.mockRejectedValueOnce(concurrentError);

    await processUseCase.execute('job-5', 1);

    // Should not throw and should not call syncVoucher
    expect(mockEngine.syncVoucher).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Concurrent worker race detected, skipping job',
      }),
      expect.any(String),
    );
  });

  // 6. Lost acknowledgement (similar to timeout, handled above)

  // 7. Verification finds voucher
  it('should transition to SYNCED if verification probe finds voucher', async () => {
    mockRepo.findJobById.mockResolvedValue({
      id: 'job-7',
      status: 'UNKNOWN',
      voucherCandidateId: 'v-7',
    });
    mockConnectionManager.getConnectionAndAdapter.mockResolvedValue({
      adapter: { verifyVoucherExists: jest.fn().mockResolvedValue('EXISTS') },
    });

    await verifyUseCase.execute('job-7', 1);

    expect(mockRepo.updateJobStatus).toHaveBeenCalledWith(
      'job-7',
      'SYNCED',
      expect.objectContaining({ statusFrom: 'VERIFYING' }),
    );
  });

  // 8. Verification does not find voucher
  it('should transition to RETRY_PENDING if verification probe does not find voucher', async () => {
    mockRepo.findJobById.mockResolvedValue({
      id: 'job-8',
      status: 'UNKNOWN',
      voucherCandidateId: 'v-8',
    });
    mockConnectionManager.getConnectionAndAdapter.mockResolvedValue({
      adapter: {
        verifyVoucherExists: jest.fn().mockResolvedValue('NOT_FOUND'),
      },
    });

    await verifyUseCase.execute('job-8', 1);

    expect(mockRepo.updateJobStatus).toHaveBeenCalledWith(
      'job-8',
      'RETRY_PENDING',
      expect.objectContaining({ statusFrom: 'VERIFYING' }),
    );
  });

  // 9. Retry exhaustion
  it('should move to MANUAL_REVIEW when max attempts reached', async () => {
    // Override retryService to simulate exhaustion for this test
    const module2 = processUseCase['retryService'] as any;
    const originalExhausted = module2.isExhausted;
    module2.isExhausted = jest.fn().mockReturnValue(true);
    module2.shouldRetry = jest.fn().mockReturnValue({ shouldRetry: false, reason: 'Max attempts' });

    mockRepo.findJobById.mockResolvedValue({
      id: 'job-9',
      status: 'PENDING',
      voucherCandidateId: 'v-9',
      attempts: 4,
      maxAttempts: 5,
    });
    mockVoucherRepo.findById.mockResolvedValue({ id: 'v-9' });
    mockEngine.syncVoucher.mockRejectedValue(new Error('Some error'));
    mockEngine.verifyVoucherExists.mockResolvedValue('NOT_FOUND');

    await processUseCase.execute('job-9', 1);

    expect(mockRepo.updateJobStatus).toHaveBeenCalledWith(
      'job-9',
      'MANUAL_REVIEW',
      expect.anything(),
    );

    // Restore
    module2.isExhausted = originalExhausted;
  });

  // 10. Manual review routing (verification limit exceeded)
  it('should move to MANUAL_REVIEW when verification max attempts reached', async () => {
    mockRepo.findJobById.mockResolvedValue({
      id: 'job-10',
      status: 'UNKNOWN',
      verificationAttempts: 3,
    });

    await verifyUseCase.execute('job-10', 1);

    expect(mockRepo.updateJobStatus).toHaveBeenCalledWith(
      'job-10',
      'MANUAL_REVIEW',
      expect.anything(),
    );
  });

  // 11. Malformed XML
  it('should transition to UNKNOWN on malformed XML response', async () => {
    mockRepo.findJobById.mockResolvedValue({
      id: 'job-11',
      status: 'PENDING',
      voucherCandidateId: 'v-11',
    });
    mockVoucherRepo.findById.mockResolvedValue({ id: 'v-11' });
    mockEngine.syncVoucher.mockResolvedValue({
      success: false,
      responseType: 'MALFORMED_XML',
      transportMetadata: { durationMs: 10 },
    });

    await processUseCase.execute('job-11', 1);

    expect(mockRepo.updateJobStatus).toHaveBeenCalledWith(
      'job-11',
      'UNKNOWN',
      expect.anything(),
    );
  });

  // 12. Business XML errors
  it('should transition to FAILED_PERMANENT on business XML errors', async () => {
    mockRepo.findJobById.mockResolvedValue({
      id: 'job-12',
      status: 'PENDING',
      voucherCandidateId: 'v-12',
    });
    mockVoucherRepo.findById.mockResolvedValue({ id: 'v-12' });
    mockEngine.syncVoucher.mockResolvedValue({
      success: false,
      responseType: 'BUSINESS_ERROR',
      transportMetadata: { durationMs: 10 },
    });

    await processUseCase.execute('job-12', 1);

    expect(mockRepo.updateJobStatus).toHaveBeenCalledWith(
      'job-12',
      'FAILED_PERMANENT',
      expect.anything(),
    );
  });

  // 13. Duplicate idempotency hash (Handled at queue creation, but tested logically here as race constraint)
  // 14. Cancelled jobs
  it('should skip CANCELLED jobs', async () => {
    mockRepo.findJobById.mockResolvedValue({
      id: 'job-14',
      status: 'CANCELLED',
    });
    await processUseCase.execute('job-14', 1);
    expect(mockEngine.syncVoucher).not.toHaveBeenCalled();
  });

  // 15. Terminal states are never retried
  it('should skip MANUAL_REVIEW jobs', async () => {
    mockRepo.findJobById.mockResolvedValue({
      id: 'job-15',
      status: 'MANUAL_REVIEW',
    });
    await processUseCase.execute('job-15', 1);
    expect(mockEngine.syncVoucher).not.toHaveBeenCalled();
  });

  // ─── AUDIT FIELD PERSISTENCE TESTS (BLOCKER-1 Fix Verification) ─────────────

  it('AUDIT-01: should persist xmlHash, transportStatus, requestXml, responseXml after successful sync', async () => {
    mockRepo.findJobById.mockResolvedValue({
      id: 'job-audit-1',
      status: 'PENDING',
      voucherCandidateId: 'v-a1',
      attempts: 0,
    });
    mockVoucherRepo.findById.mockResolvedValue({ id: 'v-a1' });
    mockEngine.syncVoucher.mockResolvedValue({
      success: true,
      referenceId: 'PUR-9999',
      requestXml: '<ENVELOPE><TEST/></ENVELOPE>',
      rawResponse: '<ENVELOPE><BODY><DESC>OK</DESC></BODY></ENVELOPE>',
      parserWarnings: [],
      transportMetadata: {
        durationMs: 120,
        httpStatus: 200,
        xmlHash: 'abc123auditHash',
        payloadSizeBytes: 256,
      },
      durationMs: 120,
    });

    await processUseCase.execute('job-audit-1', 1);

    // Verify that updateJobStatus was called with all audit fields
    const syncedCall = (mockRepo.updateJobStatus as jest.Mock).mock.calls.find(
      (c) => c[1] === 'SYNCED',
    );
    expect(syncedCall).toBeDefined();
    const auditArg = syncedCall[2];
    expect(auditArg).toMatchObject({
      xmlHash: 'abc123auditHash',
      transportStatus: 'SUCCESS',
      responseTimeMs: 120,
      requestXml: '<ENVELOPE><TEST/></ENVELOPE>',
      responseXml: '<ENVELOPE><BODY><DESC>OK</DESC></BODY></ENVELOPE>',
    });
  });

  it('AUDIT-02: should persist transportStatus=TIMEOUT_RECOVERED after timeout recovery to SYNCED', async () => {
    mockRepo.findJobById.mockResolvedValue({
      id: 'job-audit-2',
      status: 'PENDING',
      voucherCandidateId: 'v-a2',
      attempts: 0,
      maxAttempts: 5,
    });
    mockVoucherRepo.findById.mockResolvedValue({ id: 'v-a2' });

    const timeoutError = new ERPTransportException('Tally timed out', 'TIMEOUT');
    mockEngine.syncVoucher.mockRejectedValue(timeoutError);
    // Pre-flight returns NOT_FOUND (so sync is attempted), then EXISTS on timeout recovery check
    mockEngine.verifyVoucherExists
      .mockResolvedValueOnce('NOT_FOUND') // pre-flight check
      .mockResolvedValueOnce('EXISTS');   // post-timeout recovery check

    await processUseCase.execute('job-audit-2', 1);

    const syncedCall = (mockRepo.updateJobStatus as jest.Mock).mock.calls.find(
      (c) => c[1] === 'SYNCED',
    );
    expect(syncedCall).toBeDefined();
    const auditArg = syncedCall[2];
    expect(auditArg).toMatchObject({
      transportStatus: 'TIMEOUT_RECOVERED',
      lastResponse: 'Tally timed out',
    });
  });

  it('AUDIT-03: should persist transportStatus=BUSINESS_ERROR after business failure', async () => {
    mockRepo.findJobById.mockResolvedValue({
      id: 'job-audit-3',
      status: 'PENDING',
      voucherCandidateId: 'v-a3',
      attempts: 0,
    });
    mockVoucherRepo.findById.mockResolvedValue({ id: 'v-a3' });
    mockEngine.syncVoucher.mockResolvedValue({
      success: false,
      responseType: 'BUSINESS_ERROR',
      message: "Tax Classification 'CGST' does not exist!",
      requestXml: '<ENVELOPE><BAD/></ENVELOPE>',
      rawResponse: '<ENVELOPE><DESC>ERROR</DESC></ENVELOPE>',
      parserWarnings: [],
      transportMetadata: {
        durationMs: 80,
        httpStatus: 200,
        xmlHash: 'failHash456',
      },
      durationMs: 80,
    });

    await processUseCase.execute('job-audit-3', 1);

    const failCall = (mockRepo.updateJobStatus as jest.Mock).mock.calls.find(
      (c) => c[1] === 'FAILED_PERMANENT',
    );
    expect(failCall).toBeDefined();
    const auditArg = failCall[2];
    expect(auditArg).toMatchObject({
      xmlHash: 'failHash456',
      transportStatus: 'BUSINESS_ERROR',
      requestXml: '<ENVELOPE><BAD/></ENVELOPE>',
      responseXml: '<ENVELOPE><DESC>ERROR</DESC></ENVELOPE>',
      lastResponse: "Tax Classification 'CGST' does not exist!",
    });
  });
});
