import { Test, TestingModule } from '@nestjs/testing';
import { LedgerMappingEngine } from './ledger-mapping.engine';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { GoogleGenAI } from '@google/genai';

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContent: jest.fn(),
    }
  }))
}));

describe('LedgerMappingEngine', () => {
  let engine: LedgerMappingEngine;

  const mockPrisma = {
    ledgerMappingConfiguration: {
      findFirst: jest.fn(),
    }
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    delete process.env.GEMINI_API_KEY;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LedgerMappingEngine,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    engine = module.get<LedgerMappingEngine>(LedgerMappingEngine);
  });

  it('should be defined', () => {
    expect(engine).toBeDefined();
  });

  describe('resolveExpenseLedger', () => {
    it('should resolve deterministically by HSN', async () => {
      const result = await engine.resolveExpenseLedger('vendor1', 'some category', '4802');
      expect(result.selectedLedger).toBe('Printing and Stationery');
      expect(result.hsnMatch).toBe(true);
      expect(result.confidence).toBe(0.99);
    });

    it('should resolve deterministically by keyword', async () => {
      const result = await engine.resolveExpenseLedger('vendor1', 'purchase of laptop');
      expect(result.selectedLedger).toBe('Computer Equipment');
      expect(result.keywordMatch).toBe(true);
    });

    it('should fallback to config feeCategories if no deterministic match', async () => {
      mockPrisma.ledgerMappingConfiguration.findFirst.mockResolvedValue({
        feeCategories: { 'some category': 'Custom Ledger' }
      });
      const result = await engine.resolveExpenseLedger('vendor1', 'some category');
      expect(result.selectedLedger).toBe('Custom Ledger');
      expect(result.appliedRule).toBe('CATEGORY_EXPENSE_MAPPING');
    });

    it('should fallback to default vendor ledger if no category matches', async () => {
      mockPrisma.ledgerMappingConfiguration.findFirst.mockResolvedValue({
        vendorLedger: 'Default Vendor Expense'
      });
      const result = await engine.resolveExpenseLedger('vendor1', 'unknown category');
      expect(result.selectedLedger).toBe('Default Vendor Expense');
    });

    it('should resolve using Gemini AI if configured', async () => {
      process.env.GEMINI_API_KEY = 'test-key';
      
      const mockGenerateContent = jest.fn().mockResolvedValue({
        text: JSON.stringify({ ledgerCategory: 'Office Supplies', confidence: 0.88 })
      });
      (GoogleGenAI as jest.Mock).mockImplementation(() => ({
        models: { generateContent: mockGenerateContent }
      }));

      const result = await engine.resolveExpenseLedger('vendor1', 'some unknown item');
      
      expect(result.selectedLedger).toBe('Office Supplies');
      expect(result.geminiMatch).toBe(true);
      expect(result.confidence).toBe(0.88);
    });

    it('should return UNKNOWN_LEDGER if AI fails or returns invalid ledger', async () => {
      process.env.GEMINI_API_KEY = 'test-key';
      
      const mockGenerateContent = jest.fn().mockResolvedValue({
        text: JSON.stringify({ ledgerCategory: 'Invalid Ledger', confidence: 0.88 })
      });
      (GoogleGenAI as jest.Mock).mockImplementation(() => ({
        models: { generateContent: mockGenerateContent }
      }));

      const result = await engine.resolveExpenseLedger('vendor1', 'weird stuff');
      
      expect(result.selectedLedger).toBe('UNKNOWN_LEDGER');
    });
  });

  describe('resolveIncomeLedger', () => {
    it('should map by config fee category', async () => {
      mockPrisma.ledgerMappingConfiguration.findFirst.mockResolvedValue({
        feeCategories: { 'Tuition': 'Tuition Fee Income' }
      });
      const result = await engine.resolveIncomeLedger('stu1', 'Tuition');
      expect(result.selectedLedger).toBe('Tuition Fee Income');
    });

    it('should fallback to default student ledger', async () => {
      mockPrisma.ledgerMappingConfiguration.findFirst.mockResolvedValue({
        studentLedger: 'General Student Income'
      });
      const result = await engine.resolveIncomeLedger('stu1', 'Unknown');
      expect(result.selectedLedger).toBe('General Student Income');
    });

    it('should return UNKNOWN_LEDGER if config missing', async () => {
      mockPrisma.ledgerMappingConfiguration.findFirst.mockResolvedValue(null);
      const result = await engine.resolveIncomeLedger('stu1', 'Tuition');
      expect(result.selectedLedger).toBe('UNKNOWN_LEDGER');
    });
  });

  describe('resolveGstLedger', () => {
    it('should map CGST', async () => {
      const result = await engine.resolveGstLedger('CGST');
      expect(result.selectedLedger).toBe('Input CGST Ledger');
      expect(result.confidence).toBe(1.0);
    });
    
    it('should map IGST', async () => {
      const result = await engine.resolveGstLedger('IGST');
      expect(result.selectedLedger).toBe('Input IGST Ledger');
    });
  });
});
