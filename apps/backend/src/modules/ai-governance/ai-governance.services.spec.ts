import { Test, TestingModule } from '@nestjs/testing';
import { AIEvaluationService } from './ai-evaluation.service';
import { AIFeedbackService } from './ai-feedback.service';
import { AIModelService } from './ai-model.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';

const mockPrisma = {
  aIExecutionLog: {
    findMany: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  aIAccuracyMetric: {
    create: jest.fn(),
  },
  aIModelVersion: {
    findFirst: jest.fn(),
  },
} as any;

describe('AIEvaluationService', () => {
  let service: AIEvaluationService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIEvaluationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AIEvaluationService>(AIEvaluationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('evaluateDailyAccuracy', () => {
    it('should process logs and create accuracy metrics for each model', async () => {
      mockPrisma.aIExecutionLog.findMany.mockResolvedValue([
        { modelVersionId: 'model-v1', humanCorrected: false },
        { modelVersionId: 'model-v1', humanCorrected: false },
        { modelVersionId: 'model-v1', humanCorrected: true },
        { modelVersionId: 'model-v2', humanCorrected: false },
      ]);
      mockPrisma.aIAccuracyMetric.create.mockResolvedValue({});

      await service.evaluateDailyAccuracy();

      expect(mockPrisma.aIAccuracyMetric.create).toHaveBeenCalledTimes(2);

      // model-v1: 3 total, 2 correct (1 human corrected)
      expect(mockPrisma.aIAccuracyMetric.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          modelVersionId: 'model-v1',
          totalPredictions: 3,
          correctPredictions: 2,
          accuracy: 2 / 3,
        }),
      });

      // model-v2: 1 total, 1 correct
      expect(mockPrisma.aIAccuracyMetric.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          modelVersionId: 'model-v2',
          totalPredictions: 1,
          correctPredictions: 1,
          accuracy: 1,
        }),
      });
    });

    it('should not create metrics when no logs exist', async () => {
      mockPrisma.aIExecutionLog.findMany.mockResolvedValue([]);

      await service.evaluateDailyAccuracy();

      expect(mockPrisma.aIAccuracyMetric.create).not.toHaveBeenCalled();
    });

    it('should query logs for the previous day', async () => {
      mockPrisma.aIExecutionLog.findMany.mockResolvedValue([]);

      await service.evaluateDailyAccuracy();

      expect(mockPrisma.aIExecutionLog.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: expect.any(Date),
            lt: expect.any(Date),
          },
        },
      });
    });

    it('should handle all humanCorrected logs (accuracy = 0)', async () => {
      mockPrisma.aIExecutionLog.findMany.mockResolvedValue([
        { modelVersionId: 'model-v1', humanCorrected: true },
        { modelVersionId: 'model-v1', humanCorrected: true },
      ]);
      mockPrisma.aIAccuracyMetric.create.mockResolvedValue({});

      await service.evaluateDailyAccuracy();

      expect(mockPrisma.aIAccuracyMetric.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          accuracy: 0,
          correctPredictions: 0,
          totalPredictions: 2,
        }),
      });
    });
  });
});

describe('AIFeedbackService', () => {
  let service: AIFeedbackService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIFeedbackService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AIFeedbackService>(AIFeedbackService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('markHumanCorrection', () => {
    it('should update execution log as human corrected', async () => {
      const updatedLog = { id: 'log-1', humanCorrected: true };
      mockPrisma.aIExecutionLog.update.mockResolvedValue(updatedLog);

      const result = await service.markHumanCorrection('log-1');

      expect(result).toEqual(updatedLog);
      expect(mockPrisma.aIExecutionLog.update).toHaveBeenCalledWith({
        where: { id: 'log-1' },
        data: { humanCorrected: true },
      });
    });
  });
});

describe('AIModelService', () => {
  let service: AIModelService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIModelService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AIModelService>(AIModelService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getActiveModel', () => {
    it('should return the active model for a given purpose', async () => {
      const model = { id: 'model-v1', purpose: 'OCR', active: true };
      mockPrisma.aIModelVersion.findFirst.mockResolvedValue(model);

      const result = await service.getActiveModel('OCR');

      expect(result).toEqual(model);
      expect(mockPrisma.aIModelVersion.findFirst).toHaveBeenCalledWith({
        where: { purpose: 'OCR', active: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return null when no active model found', async () => {
      mockPrisma.aIModelVersion.findFirst.mockResolvedValue(null);

      const result = await service.getActiveModel('CLASSIFICATION');

      expect(result).toBeNull();
    });
  });

  describe('logExecution', () => {
    it('should create an AI execution log', async () => {
      const logData = {
        modelVersionId: 'model-v1',
        entityType: 'Invoice',
        entityId: 'inv-1',
        inputHash: 'hash-in',
        outputHash: 'hash-out',
        confidence: 0.95,
        latency: 250,
      };
      const createdLog = { id: 'log-1', ...logData };
      mockPrisma.aIExecutionLog.create.mockResolvedValue(createdLog);

      const result = await service.logExecution(logData);

      expect(result).toEqual(createdLog);
      expect(mockPrisma.aIExecutionLog.create).toHaveBeenCalledWith({ data: logData });
    });
  });
});
