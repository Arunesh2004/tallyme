import { Injectable, Logger } from '@nestjs/common';

export interface ConfidentField<T> {
  value: T;
  confidence: number;
  sourceText?: string;
}

export interface ExtractionWithConfidence {
  invoiceNumber?: ConfidentField<string>;
  invoiceDate?: ConfidentField<Date>;
  amount?: ConfidentField<number>;
  tax?: ConfidentField<number>;
  vendorName?: ConfidentField<string>;
  gstin?: ConfidentField<string>;
  overallConfidence: number;
  status: 'AUTO_ACCEPT' | 'VERIFY' | 'MANUAL_REVIEW_REQUIRED';
}

@Injectable()
export class ExtractionConfidenceEngine {
  private readonly logger = new Logger(ExtractionConfidenceEngine.name);

  public evaluateExtraction(
    rawExtraction: any,
    originalText?: string,
  ): ExtractionWithConfidence {
    // In a real AI setup, confidence would be returned by the AI.
    // For now, we simulate confidence logic based on data presence and formatting.

    const invoiceNumberConf = this.calculateStringConfidence(
      rawExtraction.invoiceNumber,
      5,
    );
    const invoiceDateConf = rawExtraction.invoiceDate ? 0.95 : 0.0;
    const amountConf = typeof rawExtraction.amount === 'number' ? 0.98 : 0.0;
    const vendorNameConf = this.calculateStringConfidence(
      rawExtraction.vendorName,
      3,
    );
    const gstinConf = this.calculateGstinConfidence(rawExtraction.gstin);

    const fields = [
      invoiceNumberConf,
      invoiceDateConf,
      amountConf,
      vendorNameConf,
      gstinConf,
    ];
    const overallConfidence = fields.reduce((a, b) => a + b, 0) / fields.length;

    let status: 'AUTO_ACCEPT' | 'VERIFY' | 'MANUAL_REVIEW_REQUIRED' =
      'MANUAL_REVIEW_REQUIRED';
    if (overallConfidence >= 0.9) {
      status = 'AUTO_ACCEPT';
    } else if (overallConfidence >= 0.7) {
      status = 'VERIFY';
    }

    return {
      invoiceNumber: {
        value: rawExtraction.invoiceNumber,
        confidence: invoiceNumberConf,
      },
      invoiceDate: {
        value: rawExtraction.invoiceDate,
        confidence: invoiceDateConf,
      },
      amount: { value: rawExtraction.amount, confidence: amountConf },
      tax: {
        value: rawExtraction.tax,
        confidence: typeof rawExtraction.tax === 'number' ? 0.95 : 0.0,
      },
      vendorName: {
        value: rawExtraction.vendorName,
        confidence: vendorNameConf,
      },
      gstin: { value: rawExtraction.gstin, confidence: gstinConf },
      overallConfidence,
      status,
    };
  }

  private calculateStringConfidence(
    val: string | undefined,
    minLength: number,
  ): number {
    if (!val) return 0.0;
    if (val.length >= minLength) return 0.92;
    return 0.6;
  }

  private calculateGstinConfidence(gstin: string | undefined): number {
    if (!gstin) return 0.0;
    // Basic GSTIN regex check (simulated)
    const gstinRegex =
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (gstinRegex.test(gstin)) return 0.99;
    return 0.5; // Found something but bad format
  }
}
