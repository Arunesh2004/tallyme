import { Test, TestingModule } from '@nestjs/testing';
import { ApprovalDispatchService } from './approval-dispatch.service';
import { QUEUE_PROVIDER } from '../../../infrastructure/queue/queue.constants';
import { LoggerService } from '../../../core/logger/logger.service';
import { VOUCHER_BUILDER_QUEUE } from '../../voucher-builder/constants/voucher.constants';

describe('ApprovalDispatchService', () => {
  let service: ApprovalDispatchService;
  let queueService: any;
  let loggerService: any;

  beforeEach(async () => {
    queueService = {
      addJob: jest.fn().mockResolvedValue(undefined),
    };
    loggerService = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalDispatchService,
        {
          provide: QUEUE_PROVIDER,
          useValue: queueService,
        },
        {
          provide: LoggerService,
          useValue: loggerService,
        },
      ],
    }).compile();

    service = module.get<ApprovalDispatchService>(ApprovalDispatchService);
  });

  it('should dispatch job correctly to VOUCHER_BUILDER_QUEUE', async () => {
    await service.dispatchApprovedDraft('draft-123');
    expect(queueService.addJob).toHaveBeenCalledWith(
      VOUCHER_BUILDER_QUEUE,
      'build-draft-voucher',
      { draftId: 'draft-123' },
    );
    expect(loggerService.log).toHaveBeenCalledWith(
      expect.stringContaining('draft-123'),
      'ApprovalDispatchService',
    );
  });

    it('should NOT swallow queue failures, throwing error back to caller', async () => {
      queueService.addJob.mockRejectedValue(new Error('Redis connection failed'));
      
      await expect(service.dispatchApprovedDraft('draft-456')).rejects.toThrow('Redis connection failed');
      
      expect(loggerService.error).toHaveBeenCalledWith(
        expect.stringContaining('draft-456'),
        expect.any(String),
        'ApprovalDispatchService',
      );
    });
});
