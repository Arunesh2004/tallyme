import { Test, TestingModule } from '@nestjs/testing';
import { BulkApprovalService } from './bulk-approval.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ApprovalWorkflowEngine } from './approval-workflow.engine';
import { AccountingDecisionAuditService } from '../decision-audit/accounting-decision-audit.service';

describe('BulkApprovalService', () => {
  let service: BulkApprovalService;
  let prisma: any;
  let approvalEngine: any;
  let auditService: any;

  beforeEach(async () => {
    prisma = {
      approvalBatch: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      approvalRequest: {
        findMany: jest.fn(),
      },
    };

    approvalEngine = {
      approve: jest.fn(),
      reject: jest.fn(),
    };

    auditService = {
      logDecision: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BulkApprovalService,
        { provide: PrismaService, useValue: prisma },
        { provide: ApprovalWorkflowEngine, useValue: approvalEngine },
        { provide: AccountingDecisionAuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<BulkApprovalService>(BulkApprovalService);
  });

  describe('approveBatch', () => {
    it('should throw if batch not found', async () => {
      prisma.approvalBatch.findUnique.mockResolvedValue(null);
      await expect(service.approveBatch('b-1', 'u-1')).rejects.toThrow('Approval Batch not found');
    });

    it('should approve batch and update requests', async () => {
      prisma.approvalBatch.findUnique.mockResolvedValue({ id: 'b-1' });
      prisma.approvalRequest.findMany.mockResolvedValue([
        { id: 'req-1', companyId: 'c-1' },
        { id: 'req-2', companyId: 'c-1' },
      ]);
      approvalEngine.approve.mockResolvedValueOnce(true).mockRejectedValueOnce(new Error('fail'));

      const result = await service.approveBatch('b-1', 'u-1');

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(prisma.approvalBatch.update).toHaveBeenCalledWith({
        where: { id: 'b-1' },
        data: expect.objectContaining({ status: 'PARTIAL', approvedCount: 1, failedCount: 1 }),
      });
      expect(auditService.logDecision).toHaveBeenCalled();
    });

    it('should set status to COMPLETED if all successful', async () => {
      prisma.approvalBatch.findUnique.mockResolvedValue({ id: 'b-1' });
      prisma.approvalRequest.findMany.mockResolvedValue([
        { id: 'req-1', companyId: 'c-1' },
      ]);
      approvalEngine.approve.mockResolvedValue(true);

      const result = await service.approveBatch('b-1', 'u-1');

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
      expect(prisma.approvalBatch.update).toHaveBeenCalledWith({
        where: { id: 'b-1' },
        data: expect.objectContaining({ status: 'COMPLETED' }),
      });
    });
  });

  describe('rejectBatch', () => {
    it('should throw if batch not found', async () => {
      prisma.approvalBatch.findUnique.mockResolvedValue(null);
      await expect(service.rejectBatch('b-1', 'u-1')).rejects.toThrow('Approval Batch not found');
    });

    it('should reject batch and update requests', async () => {
      prisma.approvalBatch.findUnique.mockResolvedValue({ id: 'b-1' });
      prisma.approvalRequest.findMany.mockResolvedValue([
        { id: 'req-1', companyId: 'c-1' },
      ]);
      approvalEngine.reject.mockResolvedValue(true);

      const result = await service.rejectBatch('b-1', 'u-1');

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
      expect(prisma.approvalBatch.update).toHaveBeenCalledWith({
        where: { id: 'b-1' },
        data: expect.objectContaining({ status: 'COMPLETED', rejectedCount: 1 }),
      });
    });

    it('should set status to FAILED if all fail', async () => {
      prisma.approvalBatch.findUnique.mockResolvedValue({ id: 'b-1' });
      prisma.approvalRequest.findMany.mockResolvedValue([
        { id: 'req-1', companyId: 'c-1' },
      ]);
      approvalEngine.reject.mockRejectedValue(new Error('fail'));

      const result = await service.rejectBatch('b-1', 'u-1');

      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
      expect(prisma.approvalBatch.update).toHaveBeenCalledWith({
        where: { id: 'b-1' },
        data: expect.objectContaining({ status: 'FAILED' }),
      });
    });
  });
});
