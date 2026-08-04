import { Test, TestingModule } from '@nestjs/testing';
import { OutboxRelayWorker } from './outbox-relay.worker';
import { TransactionOutboxRepository } from '../repositories/transaction-outbox.repository';
import { ApprovalDispatchService } from '../services/approval-dispatch.service';
import { TransactionDraftService } from '../services/transaction-draft.service';
import { PrometheusService } from '../../../shared/observability/metrics/prometheus.service';
import { LearningFeedbackService } from '../../accounting-intelligence/learning-feedback/learning-feedback.service';

describe('OutboxRelayWorker', () => {
  let worker: OutboxRelayWorker;
  let outboxRepo: any;
  let dispatchService: any;
  let draftService: any;
  let prometheusService: any;
  let learningFeedbackService: any;

  beforeEach(async () => {
    outboxRepo = {
      claimEvents: jest.fn().mockResolvedValue([]),
      markProcessed: jest.fn(),
      markFailed: jest.fn(),
    };

    dispatchService = {
      dispatchApprovedDraft: jest.fn(),
    };

    draftService = {
      updateStatus: jest.fn(),
      markFailed: jest.fn(),
    };

    prometheusService = {
      outboxPendingTotal: { inc: jest.fn() },
      relayProcessingSeconds: { startTimer: jest.fn().mockReturnValue(jest.fn()) },
      outboxDeadTotal: { inc: jest.fn() },
      outboxFailedTotal: { inc: jest.fn() },
    };

    learningFeedbackService = {
      learnFromDraft: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxRelayWorker,
        { provide: TransactionOutboxRepository, useValue: outboxRepo },
        { provide: ApprovalDispatchService, useValue: dispatchService },
        { provide: TransactionDraftService, useValue: draftService },
        { provide: PrometheusService, useValue: prometheusService },
        { provide: LearningFeedbackService, useValue: learningFeedbackService },
      ],
    }).compile();

    worker = module.get<OutboxRelayWorker>(OutboxRelayWorker);
  });

  it('should process DRAFT_APPROVED', async () => {
    outboxRepo.claimEvents.mockResolvedValue([
      { id: '1', eventType: 'DRAFT_APPROVED', payload: { draftId: 'd-1' }, retryCount: 0 },
    ]);
    
    await worker.processPendingEvents();
    expect(dispatchService.dispatchApprovedDraft).toHaveBeenCalledWith('d-1');
    expect(outboxRepo.markProcessed).toHaveBeenCalledWith('1');
  });

  it('should process VOUCHER_CREATED', async () => {
    outboxRepo.claimEvents.mockResolvedValue([
      { id: '1', eventType: 'VOUCHER_CREATED', payload: { draftId: 'd-1' }, retryCount: 0 },
    ]);
    
    await worker.processPendingEvents();
    expect(draftService.updateStatus).toHaveBeenCalledWith('d-1', 'QUEUED');
    expect(outboxRepo.markProcessed).toHaveBeenCalledWith('1');
  });

  it('should process ERP_SYNC_COMPLETED', async () => {
    outboxRepo.claimEvents.mockResolvedValue([
      { id: '1', eventType: 'ERP_SYNC_COMPLETED', payload: { draftId: 'd-1' }, retryCount: 0 },
    ]);
    
    await worker.processPendingEvents();
    expect(draftService.updateStatus).toHaveBeenCalledWith('d-1', 'SYNCED');
    expect(outboxRepo.markProcessed).toHaveBeenCalledWith('1');
  });

  it('should process ERP_SYNC_FAILED', async () => {
    outboxRepo.claimEvents.mockResolvedValue([
      { id: '1', eventType: 'ERP_SYNC_FAILED', payload: { draftId: 'd-1', reason: 'network' }, retryCount: 0 },
    ]);
    
    await worker.processPendingEvents();
    expect(draftService.markFailed).toHaveBeenCalledWith('d-1', 'network');
    expect(outboxRepo.markProcessed).toHaveBeenCalledWith('1');
  });

  it('should handle missing payload properties and fail event', async () => {
    outboxRepo.claimEvents.mockResolvedValue([
      { id: '1', eventType: 'DRAFT_APPROVED', payload: {}, retryCount: 0 },
    ]);
    outboxRepo.markFailed.mockResolvedValue({ status: 'FAILED' });
    
    await worker.processPendingEvents();
    expect(outboxRepo.markFailed).toHaveBeenCalledWith('1', 'draftId missing in event payload', 0);
    expect(prometheusService.outboxFailedTotal.inc).toHaveBeenCalled();
  });

  it('should handle unknown event types and mark as DEAD if max retries reached', async () => {
    outboxRepo.claimEvents.mockResolvedValue([
      { id: '1', eventType: 'UNKNOWN_TYPE', payload: { draftId: 'd-1' }, retryCount: 3 },
    ]);
    outboxRepo.markFailed.mockResolvedValue({ status: 'DEAD' });
    
    await worker.processPendingEvents();
    expect(outboxRepo.markFailed).toHaveBeenCalledWith('1', 'Unknown event type', 3);
    expect(prometheusService.outboxDeadTotal.inc).toHaveBeenCalled();
  });

  it('should not process if shutting down or processing', async () => {
    worker.onModuleDestroy(); // Sets isShuttingDown = true
    await worker.processPendingEvents();
    expect(outboxRepo.claimEvents).not.toHaveBeenCalled();
  });

  it('should handle fatal error gracefully', async () => {
    outboxRepo.claimEvents.mockRejectedValue(new Error('Fatal DB Error'));
    await expect(worker.processPendingEvents()).resolves.not.toThrow();
  });
});
