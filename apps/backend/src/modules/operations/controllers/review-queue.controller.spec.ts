import { Test, TestingModule } from '@nestjs/testing';
import { ReviewQueueController } from './review-queue.controller';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

describe('ReviewQueueController (Operations)', () => {
  let controller: ReviewQueueController;

  const mockPrisma = {
    invoiceCandidate: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    vendorBranch: {
      findFirst: jest.fn(),
    },
    studentPaymentCandidate: {
      findMany: jest.fn(),
      count: jest.fn(),
    }
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewQueueController],
      providers: [
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    controller = module.get<ReviewQueueController>(ReviewQueueController);
  });

  describe('getVendorQueue', () => {
    it('should return mapped vendor queue items with suggested vendor from matchDecision', async () => {
      mockPrisma.invoiceCandidate.findMany.mockResolvedValue([
        {
          id: 'inv1',
          status: 'MANUAL_REVIEW_REQUIRED',
          matchDecision: {
            selectedVendorLedger: {
              vendorBranch: {
                id: 'branch1',
                gstin: 'GSTIN1',
                vendor: { name: 'Vendor 1' }
              }
            }
          }
        }
      ]);
      mockPrisma.invoiceCandidate.count.mockResolvedValue(1);

      const result = await controller.getVendorQueue('1', '10');

      expect(result.data).toHaveLength(1);
      expect(result.data[0].suggestedVendor).toEqual({
        id: 'branch1',
        name: 'Vendor 1',
        gstin: 'GSTIN1'
      });
      expect(result.meta.total).toBe(1);
    });

    it('should return mapped vendor queue items with fallback vendorBranch lookup', async () => {
      mockPrisma.invoiceCandidate.findMany.mockResolvedValue([
        {
          id: 'inv2',
          status: 'MANUAL_REVIEW_REQUIRED',
          extractedGstin: 'GSTIN2',
          matchDecision: null
        }
      ]);
      mockPrisma.invoiceCandidate.count.mockResolvedValue(1);
      mockPrisma.vendorBranch.findFirst.mockResolvedValue({
        id: 'branch2',
        gstin: 'GSTIN2',
        vendor: { name: 'Vendor 2' }
      });

      const result = await controller.getVendorQueue('1', '10');

      expect(result.data).toHaveLength(1);
      expect(result.data[0].suggestedVendor).toEqual({
        id: 'branch2',
        name: 'Vendor 2',
        gstin: 'GSTIN2'
      });
    });

    it('should return null suggestedVendor if neither matchDecision nor fallback is found', async () => {
      mockPrisma.invoiceCandidate.findMany.mockResolvedValue([
        {
          id: 'inv3',
          status: 'MANUAL_REVIEW_REQUIRED',
          extractedGstin: 'GSTIN3',
          matchDecision: null
        }
      ]);
      mockPrisma.invoiceCandidate.count.mockResolvedValue(1);
      mockPrisma.vendorBranch.findFirst.mockResolvedValue(null);

      const result = await controller.getVendorQueue('1', '10');

      expect(result.data[0].suggestedVendor).toBeNull();
    });
  });

  describe('getStudentQueue', () => {
    it('should return student queue items', async () => {
      mockPrisma.studentPaymentCandidate.findMany.mockResolvedValue([
        { id: 'stu1', status: 'MANUAL_REVIEW' }
      ]);
      mockPrisma.studentPaymentCandidate.count.mockResolvedValue(1);

      const result = await controller.getStudentQueue('1', '10');

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(mockPrisma.studentPaymentCandidate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10
        })
      );
    });
  });
});
