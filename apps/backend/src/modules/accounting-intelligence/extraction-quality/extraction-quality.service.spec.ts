import { Test, TestingModule } from '@nestjs/testing';
import { ExtractionQualityService } from './extraction-quality.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AccountingDecisionAuditService } from '../decision-audit/accounting-decision-audit.service';

describe('ExtractionQualityService', () => {
  let service: ExtractionQualityService;

  const mockPrisma = {
    confidencePolicy: {
      findMany: jest.fn(),
    },
    extractionFieldConfidence: {
      create: jest.fn(),
    },
    accountingException: {
      create: jest.fn(),
    }
  };

  const mockAuditService = {};

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExtractionQualityService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AccountingDecisionAuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<ExtractionQualityService>(ExtractionQualityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should evaluate extractions and not require review if confidences are high', async () => {
    mockPrisma.confidencePolicy.findMany.mockResolvedValue([
      { fieldName: 'amount', minimumConfidence: 0.9, criticality: 'HIGH' }
    ]);

    const result = await service.evaluateExtraction('doc1', [
      { fieldName: 'amount', value: '100', confidence: 0.95, sourceText: '100.00' }
    ]);

    expect(result.overallReviewRequired).toBe(false);
    expect(mockPrisma.extractionFieldConfidence.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          validationStatus: 'APPROVED',
          reviewRequired: false,
        })
      })
    );
    expect(mockPrisma.accountingException.create).not.toHaveBeenCalled();
  });

  it('should evaluate extractions and require review if confidence is below policy', async () => {
    mockPrisma.confidencePolicy.findMany.mockResolvedValue([
      { fieldName: 'amount', minimumConfidence: 0.9, criticality: 'HIGH' }
    ]);

    const result = await service.evaluateExtraction('doc2', [
      { fieldName: 'amount', value: '100', confidence: 0.85, sourceText: '100.00' }
    ]);

    expect(result.overallReviewRequired).toBe(true);
    expect(mockPrisma.extractionFieldConfidence.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          validationStatus: 'REVIEW_REQUIRED',
          reviewRequired: true,
        })
      })
    );
    expect(mockPrisma.accountingException.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          exceptionType: 'LOW_EXTRACTION_CONFIDENCE',
          severity: 'HIGH'
        })
      })
    );
  });

  it('should default severity to MEDIUM if policy criticality is missing', async () => {
    mockPrisma.confidencePolicy.findMany.mockResolvedValue([
      { fieldName: 'vendorName', minimumConfidence: 0.9 } // no criticality
    ]);

    await service.evaluateExtraction('doc3', [
      { fieldName: 'vendorName', value: 'Test', confidence: 0.5, sourceText: 'Tst' }
    ]);

    expect(mockPrisma.accountingException.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          severity: 'MEDIUM'
        })
      })
    );
  });
});
