import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DuplicateDetectionService } from './duplicate-detection.service';
import { DuplicateEngineUnavailableException } from '../exceptions/duplicate-detection.exceptions';
import { DUPLICATE_DETECTION_PROVIDER, FINGERPRINT_REPOSITORY } from '../duplicate-detection.tokens';
import { DuplicateDetectionProvider } from '../interfaces/duplicate-detection-provider.interface';
import { FingerprintRepository } from '../interfaces/fingerprint-repository.interface';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { InvoiceFingerprint, DuplicateClassification, DuplicateRecommendedAction } from '@prisma/client';
import { DuplicateDetectionTelemetry } from './duplicate-detection.telemetry';
import { FingerprintFactory } from '../factories/fingerprint.factory';
import { DuplicateDetectionRequest } from '../dto/duplicate-detection-request.dto';

describe('DuplicateDetectionService', () => {
  let service: DuplicateDetectionService;
  let mockProvider: jest.Mocked<DuplicateDetectionProvider>;
  let mockRepository: jest.Mocked<FingerprintRepository>;
  let mockRedis: jest.Mocked<RedisService>;
  let mockConfig: jest.Mocked<ConfigService>;
  let mockPrisma: jest.Mocked<PrismaService>;
  let mockTelemetry: jest.Mocked<DuplicateDetectionTelemetry>;
  let mockFingerprintFactory: jest.Mocked<FingerprintFactory>;

  const mockRequest: DuplicateDetectionRequest = {
    tenantId: 'tenant-1',
    vendorId: 'vendor-1',
    invoiceNumber: 'INV1',
    amount: '100'
  };

  const mockFingerprintData: Omit<InvoiceFingerprint, 'id' | 'createdAt' | 'updatedAt' | 'classification' | 'score' | 'recommendedAction' | 'decisionMetadata' | 'providerVersion'> = {
    tenantId: 'tenant-1',
    vendorId: 'vendor-1',
    documentHash: 'hash-1',
    algorithmVersion: 'v1',
    normalizationVersion: 'v1',
    normalizedInvoiceNumber: 'INV1',
    normalizedVendorName: 'VEND1',
    normalizedAmount: '100',
    normalizedDate: '2023-01-01',
  };

  const mockDecision = Object.freeze({
    classification: DuplicateClassification.EXACT_DUPLICATE,
    score: 100,
    recommendedAction: DuplicateRecommendedAction.AUTO_BLOCK,
    matchedFingerprintIds: Object.freeze(['existing-id']) as readonly string[],
    matchedFields: Object.freeze(['documentHash']) as readonly string[],
    confidenceBreakdown: Object.freeze({ primary: 100 }),
    providerVersion: '1.0',
    algorithmVersion: 'v1',
    executionTimeMs: 10,
    decisionReason: 'Exact match found'
  });

  beforeEach(async () => {
    mockProvider = {
      evaluate: jest.fn().mockResolvedValue(mockDecision),
      health: jest.fn().mockResolvedValue(true),
      version: jest.fn().mockReturnValue('1.0'),
      capabilities: jest.fn()
    };

    mockRepository = {
      findCandidates: jest.fn().mockResolvedValue([]),
      create: jest.fn()
    };

    mockRedis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn(),
      clearPrefix: jest.fn()
    } as any;

    mockConfig = {
      get: jest.fn((key: string, def?: any) => def)
    } as any;

    mockPrisma = {
      duplicateDetectionPolicy: {
        findFirst: jest.fn().mockResolvedValue(null)
      }
    } as any;

    mockTelemetry = {
      recordRequest: jest.fn(),
      recordCacheHit: jest.fn(),
      recordCacheMiss: jest.fn(),
      recordProviderFailure: jest.fn(),
      recordTimeout: jest.fn()
    } as any;

    mockFingerprintFactory = {
      generate: jest.fn().mockReturnValue(mockFingerprintData)
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DuplicateDetectionService,
        { provide: DUPLICATE_DETECTION_PROVIDER, useValue: mockProvider },
        { provide: FINGERPRINT_REPOSITORY, useValue: mockRepository },
        { provide: RedisService, useValue: mockRedis },
        { provide: ConfigService, useValue: mockConfig },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: DuplicateDetectionTelemetry, useValue: mockTelemetry },
        { provide: FingerprintFactory, useValue: mockFingerprintFactory }
      ],
    }).compile();

    service = module.get<DuplicateDetectionService>(DuplicateDetectionService);
  });

  describe('evaluate', () => {
    it('should return NOT_DUPLICATE immediately when feature flag is disabled', async () => {
      mockConfig.get.mockImplementation((key) => {
        if (key === 'ENABLE_DUPLICATE_DETECTION') return false;
        return true;
      });

      const result = await service.evaluate(mockRequest);
      
      expect(result.decision.classification).toBe(DuplicateClassification.NOT_DUPLICATE);
      expect(result.decision.fallbackUsed).toBe(true);
      expect(mockRepository.findCandidates).not.toHaveBeenCalled();
      expect(mockProvider.evaluate).not.toHaveBeenCalled();
      expect(result.fingerprint).toEqual(mockFingerprintData);
    });

    it('should query repository for candidates and call provider', async () => {
      await service.evaluate(mockRequest);
      expect(mockFingerprintFactory.generate).toHaveBeenCalledWith(mockRequest);
      expect(mockRepository.findCandidates).toHaveBeenCalledWith('tenant-1', {
        vendorId: 'vendor-1',
        normalizedVendorName: 'VEND1'
      });
      expect(mockProvider.evaluate).toHaveBeenCalled();
    });
  });

  describe('persistFingerprint', () => {
    it('should merge fingerprint and decision and call repository', async () => {
      const mockTx = {};
      const expectedCreateObj = {
        ...mockFingerprintData,
        classification: mockDecision.classification,
        score: mockDecision.score,
        recommendedAction: mockDecision.recommendedAction,
        decisionMetadata: {
          matchedFingerprintIds: mockDecision.matchedFingerprintIds,
          matchedFields: mockDecision.matchedFields,
          confidenceBreakdown: mockDecision.confidenceBreakdown,
          decisionReason: mockDecision.decisionReason
        },
        providerVersion: mockDecision.providerVersion
      };

      await service.persistFingerprint(mockFingerprintData, mockDecision, mockTx);

      expect(mockRepository.create).toHaveBeenCalledWith(expectedCreateObj, mockTx);
    });
  });
});
