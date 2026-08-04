import { Test, TestingModule } from '@nestjs/testing';
import { ApprovalBatchService } from './approval-batch.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AccountingDecisionAuditService } from '../../accounting-intelligence/decision-audit/accounting-decision-audit.service';

describe('ApprovalBatchService', () => {
  let service: ApprovalBatchService;

  const mockPrisma = {
    approvalBatch: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    approvalBatchItem: {
      updateMany: jest.fn(),
    },
  } as any;

  const mockAuditService = {
    logDecision: jest.fn(),
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalBatchService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AccountingDecisionAuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<ApprovalBatchService>(ApprovalBatchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createBatch', () => {
    it('should create an approval batch with the correct data structure', async () => {
      const batchResult = { id: 'batch-1', batchId: 'BATCH-123', status: 'PENDING' };
      mockPrisma.approvalBatch.create.mockResolvedValue(batchResult);

      const result = await service.createBatch(
        'comp-1',
        ['txn-1', 'txn-2', 'txn-3'],
        'user-1',
      );

      expect(result).toEqual(batchResult);
      expect(mockPrisma.approvalBatch.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: 'comp-1',
          createdBy: 'user-1',
          status: 'PENDING',
          totalItems: 3,
          items: {
            create: [
              { transactionId: 'txn-1', status: 'PENDING' },
              { transactionId: 'txn-2', status: 'PENDING' },
              { transactionId: 'txn-3', status: 'PENDING' },
            ],
          },
        }),
      });
    });

    it('should create a batch with empty transaction list', async () => {
      const batchResult = { id: 'batch-empty', totalItems: 0, status: 'PENDING' };
      mockPrisma.approvalBatch.create.mockResolvedValue(batchResult);

      const result = await service.createBatch('comp-1', [], 'user-1');

      expect(result).toEqual(batchResult);
      expect(mockPrisma.approvalBatch.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ totalItems: 0 }),
      });
    });
  });

  describe('processBatchApproval', () => {
    const mockBatch = {
      id: 'batch-1',
      companyId: 'comp-1',
      totalItems: 2,
      approvedItems: 0,
      rejectedItems: 0,
      items: [
        { transactionId: 'txn-1' },
        { transactionId: 'txn-2' },
      ],
    };

    beforeEach(() => {
      mockPrisma.approvalBatch.findUnique.mockResolvedValue(mockBatch);
      mockPrisma.approvalBatchItem.updateMany.mockResolvedValue({ count: 1 });
      mockAuditService.logDecision.mockResolvedValue(undefined);
    });

    it('should mark batch as APPROVED when all items are approved', async () => {
      const updatedBatch = { id: 'batch-1', status: 'APPROVED', approvedItems: 2 };
      mockPrisma.approvalBatch.update.mockResolvedValue(updatedBatch);

      const result = await service.processBatchApproval(
        'batch-1',
        [
          { transactionId: 'txn-1', approved: true },
          { transactionId: 'txn-2', approved: true },
        ],
        'user-1',
      );

      expect(result.status).toBe('APPROVED');
      expect(mockPrisma.approvalBatch.update).toHaveBeenCalledWith({
        where: { id: 'batch-1' },
        data: expect.objectContaining({
          approvedItems: 2,
          rejectedItems: 0,
          status: 'APPROVED',
          approvedBy: 'user-1',
        }),
      });
    });

    it('should mark batch as PARTIALLY_APPROVED when some items rejected', async () => {
      const updatedBatch = { id: 'batch-1', status: 'PARTIALLY_APPROVED' };
      mockPrisma.approvalBatch.update.mockResolvedValue(updatedBatch);

      const result = await service.processBatchApproval(
        'batch-1',
        [
          { transactionId: 'txn-1', approved: true },
          { transactionId: 'txn-2', approved: false, comment: 'Invalid receipt' },
        ],
        'user-1',
      );

      expect(result.status).toBe('PARTIALLY_APPROVED');
      expect(mockPrisma.approvalBatch.update).toHaveBeenCalledWith({
        where: { id: 'batch-1' },
        data: expect.objectContaining({
          approvedItems: 1,
          rejectedItems: 1,
          status: 'PARTIALLY_APPROVED',
          approvedBy: 'user-1',
        }),
      });
    });

    it('should mark batch as UNDER_REVIEW when not all items are processed', async () => {
      const updatedBatch = { id: 'batch-1', status: 'UNDER_REVIEW' };
      mockPrisma.approvalBatch.update.mockResolvedValue(updatedBatch);

      // Only process 1 of 2 items
      const result = await service.processBatchApproval(
        'batch-1',
        [{ transactionId: 'txn-1', approved: true }],
        'user-1',
      );

      expect(result.status).toBe('UNDER_REVIEW');
      expect(mockPrisma.approvalBatch.update).toHaveBeenCalledWith({
        where: { id: 'batch-1' },
        data: expect.objectContaining({
          status: 'UNDER_REVIEW',
          approvedBy: null,
        }),
      });
    });

    it('should call audit service after processing', async () => {
      mockPrisma.approvalBatch.update.mockResolvedValue({ id: 'batch-1', status: 'APPROVED' });

      await service.processBatchApproval(
        'batch-1',
        [
          { transactionId: 'txn-1', approved: true },
          { transactionId: 'txn-2', approved: true },
        ],
        'user-2',
      );

      expect(mockAuditService.logDecision).toHaveBeenCalledWith({
        companyId: 'comp-1',
        userId: 'user-2',
        inputData: { batchId: 'batch-1', approvals: expect.any(Array) },
        resolverOutput: { status: 'APPROVED' },
        appliedRules: ['BATCH_APPROVAL'],
        ledgerDecision: { status: 'SUCCESS' },
        confidence: 100,
        userOverride: false,
      });
    });

    it('should throw Error when batch is not found', async () => {
      mockPrisma.approvalBatch.findUnique.mockResolvedValue(null);

      await expect(
        service.processBatchApproval('non-existent', [], 'user-1'),
      ).rejects.toThrow('Batch not found');
    });

    it('should throw Error when batch is missing companyId', async () => {
      mockPrisma.approvalBatch.findUnique.mockResolvedValue({
        ...mockBatch,
        companyId: null,
        totalItems: 0,
      });
      mockPrisma.approvalBatch.update.mockResolvedValue({ status: 'APPROVED' });

      await expect(
        service.processBatchApproval('batch-1', [], 'user-1'),
      ).rejects.toThrow('Batch is missing companyId');
    });
  });
});
