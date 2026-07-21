import { Test, TestingModule } from '@nestjs/testing';
import { ProcessERPSyncUseCase } from './use-cases/process-erp-sync.use-case';
import { VerifyERPSyncUseCase } from './use-cases/verify-erp-sync.use-case';
import { ERP_REPOSITORY, VOUCHER_REPOSITORY } from './constants/erp.constants';
import { ERPConnectorEngine } from './services/connector.engine';
import { ERPConnectionManager } from './services/connection.manager';
import { LoggerService } from '../../core/logger/logger.service';
import { QUEUE_PROVIDER } from '../../infrastructure/queue/queue.constants';
import { ERPTransportException } from './exceptions/erp-transport.exception';

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcessERPSyncUseCase,
        VerifyERPSyncUseCase,
        { provide: ERP_REPOSITORY, useValue: mockRepo },
        { provide: VOUCHER_REPOSITORY, useValue: mockVoucherRepo },
        { provide: ERPConnectorEngine, useValue: mockEngine },
        { provide: QUEUE_PROVIDER, useValue: mockQueue },
        { provide: LoggerService, useValue: mockLogger },
        {
          provide: ERPConnectionManager,
          useValue: mockConnectionManager,
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

  // 2. Transport timeout
  it('should handle transport timeout (UNKNOWN)', async () => {
    mockRepo.findJobById.mockResolvedValue({
      id: 'job-2',
      status: 'PENDING',
      voucherCandidateId: 'v-2',
    });
    mockVoucherRepo.findById.mockResolvedValue({ id: 'v-2' });
    const timeoutError = new ERPTransportException('Timeout', 'TIMEOUT');
    mockEngine.syncVoucher.mockRejectedValue(timeoutError);

    await processUseCase.execute('job-2', 1);

    expect(mockRepo.updateJobStatus).toHaveBeenCalledWith(
      'job-2',
      'UNKNOWN',
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
    mockRepo.findJobById.mockResolvedValue({
      id: 'job-9',
      status: 'PENDING',
      voucherCandidateId: 'v-9',
      attempts: 4,
      maxAttempts: 5,
    });
    mockVoucherRepo.findById.mockResolvedValue({ id: 'v-9' });
    mockEngine.syncVoucher.mockRejectedValue(new Error('Some error'));

    await processUseCase.execute('job-9', 1);

    expect(mockRepo.updateJobStatus).toHaveBeenCalledWith(
      'job-9',
      'MANUAL_REVIEW',
      expect.anything(),
    );
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
});
