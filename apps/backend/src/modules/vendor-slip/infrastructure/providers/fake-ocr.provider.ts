import { Injectable } from '@nestjs/common';
import { IOCRProvider } from '../../domain/providers/ocr.provider';

@Injectable()
export class FakeOCRProvider implements IOCRProvider {
  async processDocument(
    documentUrl: string,
    mimeType: string,
  ): Promise<{ text: string; confidence: number }> {
    // For test scenarios, we can encode instructions in the documentUrl
    if (documentUrl.includes('fail_ocr')) {
      throw new Error('OCR Provider Exception');
    }

    if (documentUrl.includes('low_confidence')) {
      return { text: 'BLURRY TEXT INVOICE 123', confidence: 0.65 };
    }

    return {
      text: 'INVOICE 123\nDate: 2023-10-15\nVendor: Acme Corp\nTotal: 1500.00',
      confidence: 0.95,
    };
  }
}
