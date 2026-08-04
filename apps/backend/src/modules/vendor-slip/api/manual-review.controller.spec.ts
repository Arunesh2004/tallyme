import { Test, TestingModule } from '@nestjs/testing';
import { ManualReviewController, RejectReviewDto } from './manual-review.controller';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { QUEUE_PROVIDER } from '../../../infrastructure/queue/queue.constants';
import { LoggerService } from '../../../core/logger/logger.service';
import { CompanyContextService } from '../../../core/context/company-context.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ManualReviewController', () => {
  let controller: ManualReviewController;
  let prisma: any;
  let queueService: any;
  let logger: any;
  let companyContext: any;

  beforeEach(async () => {
    prisma = {
      manualReviewTask: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      invoiceCandidate: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      vendorSlipAudit: {
        create: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    queueService = {
      addJob: jest.fn(),
    };

    logger = {
      log: jest.fn(),
    };

    companyContext = {
      getCompanyId: jest.fn().mockReturnValue('comp-1'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ManualReviewController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: QUEUE_PROVIDER, useValue: queueService },
        { provide: LoggerService, useValue: logger },
        { provide: CompanyContextService, useValue: companyContext },
      ],
    }).compile();

    controller = module.get<ManualReviewController>(ManualReviewController);
  });

  describe('listReviews', () => {
    it('should return pending reviews', async () => {
      prisma.manualReviewTask.findMany.mockResolvedValue([{ id: 'task-1' }]);
      const result = await controller.listReviews();
      expect(result).toEqual({ data: [{ id: 'task-1' }] });
      expect(prisma.manualReviewTask.findMany).toHaveBeenCalledWith({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getReview', () => {
    it('should throw if not found', async () => {
      prisma.manualReviewTask.findUnique.mockResolvedValue(null);
      await expect(controller.getReview('invalid')).rejects.toThrow(NotFoundException);
    });

    it('should return task with linked candidate', async () => {
      prisma.manualReviewTask.findUnique.mockResolvedValue({ id: 'task-1', entityType: 'InvoiceCandidate', entityId: 'cand-1' });
      prisma.invoiceCandidate.findUnique.mockResolvedValue({ id: 'cand-1' });
      
      const result = await controller.getReview('task-1');
      expect(result).toEqual({ id: 'task-1', entityType: 'InvoiceCandidate', entityId: 'cand-1', candidate: { id: 'cand-1' } });
    });
  });

  describe('approveReview', () => {
    it('should approve review and dispatch back to pipeline', async () => {
      const task = { id: 'task-1', status: 'PENDING', entityType: 'InvoiceCandidate', entityId: 'cand-1' };
      const candidate = { id: 'cand-1', status: 'MANUAL_REVIEW_REQUIRED', documentId: 'doc-1' };
      
      prisma.manualReviewTask.findUnique.mockResolvedValue(task);
      prisma.invoiceCandidate.findUnique.mockResolvedValue(candidate);
      
      const req: any = { user: { id: 'user-1' } };
      
      const result = await controller.approveReview('task-1', req);
      
      expect(prisma.manualReviewTask.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { status: 'RESOLVED', resolution: 'APPROVED', assignedTo: 'user-1' },
      });
      
      expect(prisma.invoiceCandidate.update).toHaveBeenCalledWith({
        where: { id: 'cand-1' },
        data: { status: 'APPROVED' },
      });
      
      expect(queueService.addJob).toHaveBeenCalledWith('vendor-slip-queue', 'process-vendor-slip', { candidateId: 'cand-1', companyId: 'comp-1' });
      expect(result.status).toBe('APPROVED');
    });

    it('should throw if task not pending', async () => {
      prisma.manualReviewTask.findUnique.mockResolvedValue({ status: 'RESOLVED' });
      const req: any = { user: {} };
      await expect(controller.approveReview('1', req)).rejects.toThrow(BadRequestException);
    });
  });

  describe('rejectReview', () => {
    it('should reject review', async () => {
      const task = { id: 'task-1', status: 'PENDING', entityType: 'InvoiceCandidate', entityId: 'cand-1' };
      const candidate = { id: 'cand-1', documentId: 'doc-1' };
      
      // task lookup
      prisma.manualReviewTask.findUnique.mockResolvedValue(task);
      // candidate lookup in tx
      prisma.invoiceCandidate.findUnique.mockResolvedValue(candidate);
      
      const dto: RejectReviewDto = { reason: 'blurry image' };
      const req: any = { user: { id: 'user-1' } };
      
      const result = await controller.rejectReview('task-1', dto, req);
      
      expect(prisma.manualReviewTask.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { status: 'REJECTED', resolution: 'blurry image', assignedTo: 'user-1' },
      });
      expect(prisma.invoiceCandidate.update).toHaveBeenCalledWith({
        where: { id: 'cand-1' },
        data: { status: 'FAILED' },
      });
      expect(result.status).toBe('REJECTED');
      expect(result.reason).toBe('blurry image');
    });
  });
});
