import { Test, TestingModule } from '@nestjs/testing';
import { VendorIntelligenceService } from './vendor-intelligence.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { defaultVendorMatchingConfig } from './vendor-matching.config';

describe('VendorIntelligenceService', () => {
  let service: VendorIntelligenceService;

  const mockPrisma = {
    vendorLedger: {
      findMany: jest.fn(),
    }
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorIntelligenceService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<VendorIntelligenceService>(VendorIntelligenceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('resolveVendor', () => {
    const mockVendor = {
      id: 'v1',
      vendorBranch: {
        gstin: 'GSTIN1',
        vendor: { name: 'Acme Corp', gstin: 'GSTIN1', pan: 'PAN1' }
      },
      aliases: [{ aliasText: 'Acme Corporation' }]
    };

    it('should resolve by exact GST match', async () => {
      mockPrisma.vendorLedger.findMany.mockResolvedValue([mockVendor]);

      const result = await service.resolveVendor('c1', { extractedGstin: 'GSTIN1' });
      
      expect(result.decision).toBe('RESOLVED');
      expect(result.confidence).toBe(1.0);
      expect(result.risk).toBe('LOW');
      expect(result.matchedVendor.id).toBe('v1');
    });

    it('should request manual review on ambiguous GST match', async () => {
      const mockVendor2 = { ...mockVendor, id: 'v2' };
      mockPrisma.vendorLedger.findMany.mockResolvedValue([mockVendor, mockVendor2]);

      const result = await service.resolveVendor('c1', { extractedGstin: 'GSTIN1' });
      
      expect(result.decision).toBe('MANUAL_REVIEW');
      expect(result.risk).toBe('CRITICAL');
      expect(result.reason).toContain('Multiple GST matches');
    });

    it('should resolve by exact name match', async () => {
      mockPrisma.vendorLedger.findMany.mockResolvedValue([mockVendor]);

      const result = await service.resolveVendor('c1', { extractedName: 'Acme Corp' });
      
      expect(result.decision).toBe('RESOLVED');
      expect(result.confidence).toBe(1.0);
      expect(result.risk).toBe('MEDIUM');
      expect(result.matchedVendor.id).toBe('v1');
    });

    it('should resolve by alias match', async () => {
      mockPrisma.vendorLedger.findMany.mockResolvedValue([mockVendor]);

      const result = await service.resolveVendor('c1', { extractedName: 'Acme Corporation' });
      
      expect(result.decision).toBe('RESOLVED');
      expect(result.confidence).toBe(1.0);
      expect(result.risk).toBe('LOW');
      expect(result.matchedVendor.id).toBe('v1');
    });

    it('should resolve by fuzzy match to manual review', async () => {
      mockPrisma.vendorLedger.findMany.mockResolvedValue([mockVendor]);

      const result = await service.resolveVendor('c1', { extractedName: 'Acme Crp' });
      
      expect(result.decision).toBe('MANUAL_REVIEW');
      expect(result.confidence).toBeGreaterThanOrEqual(defaultVendorMatchingConfig.manualReviewThreshold);
      expect(result.risk).toBe('HIGH');
    });

    it('should create new vendor if no match found', async () => {
      mockPrisma.vendorLedger.findMany.mockResolvedValue([mockVendor]);

      const result = await service.resolveVendor('c1', { extractedName: 'Totally Different' });
      
      expect(result.decision).toBe('CREATE_VENDOR');
      expect(result.nextAction).toBe('CREATE_PENDING_VENDOR');
      expect(result.matchedVendor).toBeNull();
    });

    it('should request manual review on GST conflict', async () => {
      mockPrisma.vendorLedger.findMany.mockResolvedValue([mockVendor]);

      const result = await service.resolveVendor('c1', { extractedName: 'Acme Corp', extractedGstin: 'DIFFERENT_GST' });
      
      expect(result.decision).toBe('MANUAL_REVIEW');
      expect(result.risk).toBe('CRITICAL');
      expect(result.reason).toContain('GST Conflict');
    });

    it('should request manual review on duplicates found', async () => {
      const mockVendor2 = { ...mockVendor, id: 'v2', vendorBranch: { gstin: 'GSTIN2', vendor: { pan: 'PAN1', name: 'Other' } }, aliases: [] };
      mockPrisma.vendorLedger.findMany.mockResolvedValue([mockVendor, mockVendor2]);

      const result = await service.resolveVendor('c1', { extractedName: 'Totally Different', extractedPan: 'PAN1' });
      
      expect(result.decision).toBe('MANUAL_REVIEW');
      expect(result.risk).toBe('CRITICAL');
      expect(result.reason).toContain('Duplicates found');
    });
  });
});
