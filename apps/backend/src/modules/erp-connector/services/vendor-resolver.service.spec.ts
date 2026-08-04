import { Test, TestingModule } from '@nestjs/testing';
import { VendorResolverService } from './vendor-resolver.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

describe('VendorResolverService', () => {
  let service: VendorResolverService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      tallyMasterMapping: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorResolverService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<VendorResolverService>(VendorResolverService);
  });

  describe('resolveVendor', () => {
    it('should return exact similarity match (1.0)', async () => {
      prisma.tallyMasterMapping.findMany.mockResolvedValue([
        { tallyName: 'Acme Corp' },
      ]);

      const result = await service.resolveVendor({ name: 'Acme Corp' }, 'company-1');
      
      expect(result.status).toBe('POSSIBLE_MATCH');
      expect(result.suggestion).toBe('Acme Corp');
    });

    it('should return inclusion similarity match (0.92)', async () => {
      prisma.tallyMasterMapping.findMany.mockResolvedValue([
        { tallyName: 'Acme Corporation Ltd' },
      ]);

      const result = await service.resolveVendor({ name: 'Acme Corporation' }, 'company-1');
      
      expect(result.status).toBe('POSSIBLE_MATCH');
      expect(result.suggestion).toBe('Acme Corporation Ltd');
    });

    it('should calculate Jaccard similarity', async () => {
      prisma.tallyMasterMapping.findMany.mockResolvedValue([
        { tallyName: 'Acme Global Corporation Ltd' },
      ]);

      // Sets:
      // s1: ['acme', 'global', 'ltd'] -> 3
      // s2: ['acme', 'global', 'corporation', 'ltd'] -> 4
      // intersection: ['acme', 'global', 'ltd'] -> 3
      // union: ['acme', 'global', 'ltd', 'corporation'] -> 4
      // sim: 3/4 = 0.75 (which is <= 0.9, so it should return MISSING)
      const result = await service.resolveVendor({ name: 'Acme Global Ltd' }, 'company-1');
      
      expect(result.status).toBe('MISSING');
      expect(result.requiresApproval).toBe(true);
    });

    it('should handle missing matches', async () => {
      prisma.tallyMasterMapping.findMany.mockResolvedValue([]);

      const result = await service.resolveVendor({ name: 'Unknown Vendor', gstin: '123', pan: '456', mobile: '789' }, 'company-1');
      
      expect(result.status).toBe('MISSING');
      expect(result.message).toBe('New Ledger Required');
      expect(result.requiresApproval).toBe(true);
    });
  });
});
