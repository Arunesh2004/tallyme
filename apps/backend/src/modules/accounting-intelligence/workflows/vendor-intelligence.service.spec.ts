import { Test, TestingModule } from '@nestjs/testing';
import { VendorIntelligenceService } from './vendor-intelligence.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

describe('VendorIntelligenceService', () => {
  let service: VendorIntelligenceService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      approvalBatch: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorIntelligenceService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<VendorIntelligenceService>(VendorIntelligenceService);
  });

  describe('preSyncValidation', () => {
    it('should always return true', async () => {
      const result = await service.preSyncValidation('doc-1');
      expect(result).toBe(true);
    });
  });

  describe('createApprovalBatch', () => {
    it('should create a batch and return its id', async () => {
      prisma.approvalBatch.create.mockResolvedValue({ id: 'batch-1' });
      const id = await service.createApprovalBatch(['inv-1', 'inv-2'], 'user-1');
      expect(id).toBe('batch-1');
      expect(prisma.approvalBatch.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ totalRequests: 2, status: 'PENDING', createdBy: 'user-1' }),
      });
    });
  });

  describe('processBulkApproval', () => {
    it('should approve all in batch', async () => {
      prisma.approvalBatch.findUnique.mockResolvedValue({ id: 'b-1', totalRequests: 5 });
      prisma.approvalBatch.update.mockResolvedValue({});
      const result = await service.processBulkApproval('BATCH-1');
      expect(result.status).toBe('COMPLETED');
      expect(result.approvedCount).toBe(5);
      expect(result.rejectedCount).toBe(0);
    });

    it('should throw if batch not found', async () => {
      prisma.approvalBatch.findUnique.mockResolvedValue(null);
      await expect(service.processBulkApproval('BATCH-X')).rejects.toThrow('Batch not found');
    });
  });

  describe('processBulkRejection', () => {
    it('should reject all in batch', async () => {
      prisma.approvalBatch.findUnique.mockResolvedValue({ id: 'b-1', totalRequests: 3 });
      prisma.approvalBatch.update.mockResolvedValue({});
      const result = await service.processBulkRejection('BATCH-1');
      expect(result.status).toBe('REJECTED');
      expect(result.rejectedCount).toBe(3);
      expect(result.approvedCount).toBe(0);
    });

    it('should throw if batch not found', async () => {
      prisma.approvalBatch.findUnique.mockResolvedValue(null);
      await expect(service.processBulkRejection('BATCH-X')).rejects.toThrow('Batch not found');
    });
  });
});
