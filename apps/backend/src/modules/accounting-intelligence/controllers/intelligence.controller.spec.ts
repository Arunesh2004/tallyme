import { Test, TestingModule } from '@nestjs/testing';
import { IntelligenceController } from './intelligence.controller';
import { LearningFeedbackService } from '../learning-feedback/learning-feedback.service';
import { LoggerService } from '../../../core/logger/logger.service';
import { Reflector } from '@nestjs/core';

describe('IntelligenceController', () => {
  let controller: IntelligenceController;
  
  const mockFeedbackService = {
    recordCorrection: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IntelligenceController],
      providers: [
        { provide: LearningFeedbackService, useValue: mockFeedbackService },
        { provide: LoggerService, useValue: { log: jest.fn(), error: jest.fn(), warn: jest.fn() } },
        Reflector,
      ],
    }).compile();

    controller = module.get<IntelligenceController>(IntelligenceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAccuracy', () => {
    it('should return accuracy metrics', async () => {
      const result = await controller.getAccuracy();
      expect(result).toMatchObject({
        extractionAccuracy: 0.96,
        vendorMatching: 0.94,
        invoiceNumberAccuracy: 0.98,
      });
    });
  });

  describe('getExceptions', () => {
    it('should return exceptions list', async () => {
      const result = await controller.getExceptions();
      expect(result).toEqual([]);
    });
  });

  describe('submitCorrection', () => {
    it('should submit correction using learning feedback service', async () => {
      mockFeedbackService.recordCorrection.mockResolvedValue({ id: 'correction1' });
      
      const body = {
        documentId: 'doc1',
        fieldName: 'amount',
        oldValue: '100',
        newValue: '200',
      };
      
      const result = await controller.submitCorrection(body, 'user1');
      
      expect(mockFeedbackService.recordCorrection).toHaveBeenCalledWith(
        'doc1',
        'amount',
        '100',
        '200',
        'user1'
      );
      expect(result).toEqual({ id: 'correction1' });
    });

    it('should fallback to system user if userId is not provided', async () => {
      mockFeedbackService.recordCorrection.mockResolvedValue({ id: 'correction2' });
      
      const body = {
        documentId: 'doc2',
        fieldName: 'date',
        oldValue: 'old',
        newValue: 'new',
      };
      
      await controller.submitCorrection(body, undefined as any);
      
      expect(mockFeedbackService.recordCorrection).toHaveBeenCalledWith(
        'doc2',
        'date',
        'old',
        'new',
        'system'
      );
    });
  });
});
