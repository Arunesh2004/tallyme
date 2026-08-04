import { Test, TestingModule } from '@nestjs/testing';
import { ExtractionLearningService } from './extraction-learning.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

describe('ExtractionLearningService', () => {
  let service: ExtractionLearningService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      extractionCorrectionLog: {
        create: jest.fn(),
        groupBy: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExtractionLearningService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ExtractionLearningService>(ExtractionLearningService);
  });

  describe('logCorrection', () => {
    it('should create a correction log', async () => {
      const data = {
        documentId: 'doc-1',
        fieldName: 'totalAmount',
        oldValue: '100',
        newValue: '150',
        reason: 'OCR error',
        correctedBy: 'user-1',
      };
      
      prisma.extractionCorrectionLog.create.mockResolvedValue({ id: 'log-1', ...data });
      
      const result = await service.logCorrection(data);
      
      expect(result).toEqual({ id: 'log-1', ...data });
      expect(prisma.extractionCorrectionLog.create).toHaveBeenCalledWith({
        data,
      });
    });
  });

  describe('analyzeRepeatedMistakes', () => {
    it('should return grouped mistake counts', async () => {
      const mockResult = [
        { fieldName: 'totalAmount', _count: { fieldName: 5 } },
        { fieldName: 'vendorName', _count: { fieldName: 2 } },
      ];
      
      prisma.extractionCorrectionLog.groupBy.mockResolvedValue(mockResult);
      
      const result = await service.analyzeRepeatedMistakes(30);
      
      expect(result).toEqual([
        { fieldName: 'totalAmount', mistakeCount: 5 },
        { fieldName: 'vendorName', mistakeCount: 2 },
      ]);
      
      expect(prisma.extractionCorrectionLog.groupBy).toHaveBeenCalledWith({
        by: ['fieldName'],
        _count: { fieldName: true },
        where: { createdAt: { gte: expect.any(Date) } },
        orderBy: { _count: { fieldName: 'desc' } },
      });
    });
  });
});
