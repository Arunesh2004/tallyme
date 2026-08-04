import { Test, TestingModule } from '@nestjs/testing';
import { ExtractionConfidenceEngine } from './extraction-confidence.engine';

describe('ExtractionConfidenceEngine', () => {
  let engine: ExtractionConfidenceEngine;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExtractionConfidenceEngine],
    }).compile();

    engine = module.get<ExtractionConfidenceEngine>(ExtractionConfidenceEngine);
  });

  it('should be defined', () => {
    expect(engine).toBeDefined();
  });

  it('should evaluate extraction and return AUTO_ACCEPT for high confidence', () => {
    const rawData = {
      invoiceNumber: 'INV-12345',
      invoiceDate: new Date(),
      amount: 1000,
      tax: 180,
      vendorName: 'Acme Corp',
      gstin: '29ABCDE1234F1Z5',
    };

    const result = engine.evaluateExtraction(rawData);

    expect(result.status).toBe('AUTO_ACCEPT');
    expect(result.overallConfidence).toBeGreaterThanOrEqual(0.9);
    expect(result.invoiceNumber?.confidence).toBe(0.92);
    expect(result.gstin?.confidence).toBe(0.99);
  });

  it('should evaluate extraction and return VERIFY for medium confidence', () => {
    const rawData = {
      invoiceNumber: 'INV-12345',
      invoiceDate: new Date(),
      amount: 1000,
      tax: 180,
      vendorName: 'Acme', // adds enough confidence to cross 0.7
      // missing vendorName, gstin formatting is bad
      gstin: 'bad-gstin',
    };

    const result = engine.evaluateExtraction(rawData);

    expect(result.status).toBe('VERIFY');
    expect(result.overallConfidence).toBeLessThan(0.9);
    expect(result.overallConfidence).toBeGreaterThanOrEqual(0.7);
    expect(result.gstin?.confidence).toBe(0.5);
    expect(result.vendorName?.confidence).toBe(0.92);
  });

  it('should evaluate extraction and return MANUAL_REVIEW_REQUIRED for low confidence', () => {
    const rawData = {
      // most fields missing
      invoiceNumber: 'INV', // short length -> 0.6
      tax: 180,
    };

    const result = engine.evaluateExtraction(rawData);

    expect(result.status).toBe('MANUAL_REVIEW_REQUIRED');
    expect(result.overallConfidence).toBeLessThan(0.7);
    expect(result.invoiceNumber?.confidence).toBe(0.6);
  });
});
