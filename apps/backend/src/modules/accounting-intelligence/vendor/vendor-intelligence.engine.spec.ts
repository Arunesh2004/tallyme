import { Test, TestingModule } from '@nestjs/testing';
import { VendorIntelligenceEngine } from './vendor-intelligence.engine';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

describe('VendorIntelligenceEngine', () => {
  let engine: VendorIntelligenceEngine;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      vendor: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorIntelligenceEngine,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    engine = module.get<VendorIntelligenceEngine>(VendorIntelligenceEngine);
  });

  it('should match vendor by GSTIN exact', async () => {
    prisma.vendor.findFirst.mockResolvedValueOnce({ id: 'vendor-1', gstin: '36AAAAA1234A1Z5' });
    const result = await engine.evaluateVendor('Acme Corp', '36AAAAA1234A1Z5');
    
    expect(result.method).toBe('GSTIN_EXACT');
    expect(result.matchConfidence).toBe(0.99);
    expect(result.suggestedVendorId).toBe('vendor-1');
  });

  it('should match vendor by name similarity when GSTIN fails or is absent', async () => {
    prisma.vendor.findFirst
      .mockResolvedValueOnce(null) // gstin query returns null
      .mockResolvedValueOnce({ id: 'vendor-2', name: 'Acme Corporation' }); // name query
      
    const result = await engine.evaluateVendor('Acme Corp', '36AAAAA1234A1Z5');
    
    expect(result.method).toBe('NAME_SIMILARITY');
    expect(result.suggestedVendorId).toBe('vendor-2');
    // Length ratio calculation: 'Acme Corp' (9) / 'Acme Corporation' (16) * 0.9 = 0.50625
    expect(result.matchConfidence).toBeCloseTo(0.50625);
  });
  
  it('should match vendor by name similarity when GSTIN is missing', async () => {
    prisma.vendor.findFirst.mockResolvedValueOnce({ id: 'vendor-2', name: 'Acme Corp' }); // name query
      
    const result = await engine.evaluateVendor('Acme Corp');
    
    expect(result.method).toBe('NAME_SIMILARITY');
    expect(result.suggestedVendorId).toBe('vendor-2');
    expect(result.matchConfidence).toBe(0.9);
  });

  it('should handle missing name gracefully', async () => {
    prisma.vendor.findFirst.mockResolvedValueOnce({ id: 'vendor-2', name: null }); // name query
      
    const result = await engine.evaluateVendor('Acme Corp');
    
    expect(result.method).toBe('NAME_SIMILARITY');
    expect(result.suggestedVendorId).toBe('vendor-2');
    expect(result.matchConfidence).toBe(0);
  });

  it('should return NO_MATCH if no vendor is found', async () => {
    prisma.vendor.findFirst.mockResolvedValue(null);
    const result = await engine.evaluateVendor('Acme Corp');
    
    expect(result.method).toBe('NO_MATCH');
    expect(result.matchConfidence).toBe(0.1);
    expect(result.suggestedVendorId).toBeNull();
  });
});
