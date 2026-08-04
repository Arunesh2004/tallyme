import { Test, TestingModule } from '@nestjs/testing';
import { LearningFeedbackService } from './learning-feedback.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

describe('LearningFeedbackService', () => {
  let service: LearningFeedbackService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      extractionCorrection: {
        create: jest.fn(),
      },
      correctionPattern: {
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LearningFeedbackService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<LearningFeedbackService>(LearningFeedbackService);
  });

  describe('recordCorrection', () => {
    it('should create new pattern if none exists', async () => {
      prisma.correctionPattern.findFirst.mockResolvedValue(null);
      prisma.correctionPattern.create.mockResolvedValue({ id: 'p-1', confidenceImprovement: 0.1 });

      const result = await service.recordCorrection('doc-1', 'amount', '100', '150', 'user-1');

      expect(prisma.extractionCorrection.create).toHaveBeenCalledWith({
        data: { documentId: 'doc-1', fieldName: 'amount', oldValue: '100', newValue: '150', correctedBy: 'user-1' },
      });
      expect(prisma.correctionPattern.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ fieldName: 'amount', wrongValue: '100', correctValue: '150', frequency: 1, confidenceImprovement: 0.1 }),
      });
      expect(result.id).toBe('p-1');
    });

    it('should update existing pattern if found', async () => {
      prisma.correctionPattern.findFirst.mockResolvedValue({ id: 'p-1' });
      prisma.correctionPattern.update.mockResolvedValue({ id: 'p-1', confidenceImprovement: 0.2 });

      const result = await service.recordCorrection('doc-1', 'amount', '100', '150', 'user-1');

      expect(prisma.extractionCorrection.create).toHaveBeenCalled();
      expect(prisma.correctionPattern.update).toHaveBeenCalledWith({
        where: { id: 'p-1' },
        data: expect.objectContaining({ frequency: { increment: 1 }, confidenceImprovement: { increment: 0.05 } }),
      });
      expect(result.id).toBe('p-1');
    });
  });
});
