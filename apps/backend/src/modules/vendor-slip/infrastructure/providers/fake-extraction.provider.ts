import { Injectable } from '@nestjs/common';
import {
  IInvoiceExtractionProvider,
  ExtractedInvoiceData,
} from '../../domain/providers/extraction.provider';

@Injectable()
export class FakeInvoiceExtractionProvider implements IInvoiceExtractionProvider {
  async extractInvoiceData(text: string): Promise<ExtractedInvoiceData> {
    if (text.includes('FAIL_AI')) {
      throw new Error('AI Provider Exception');
    }

    if (text.includes('MISSING_VENDOR')) {
      return {
        invoiceNumber: 'INV-999',
        date: new Date('2023-10-15'),
        subtotal: 1000,
        tax: 200,
        total: 1200,
        extractedGstin: null,
        extractedPan: null,
        extractedName: null,
        confidence: 0.85,
      };
    }

    return {
      invoiceNumber: 'INV-12345',
      date: new Date('2023-10-15'),
      subtotal: 1000.0,
      tax: 180.0,
      total: 1180.0,
      extractedGstin: '29ABCDE1234F1Z5',
      extractedPan: 'ABCDE1234F',
      extractedName: 'Acme Corp',
      confidence: 0.95,
    };
  }
}
