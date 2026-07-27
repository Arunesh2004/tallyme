import { Injectable } from '@nestjs/common';
import { BasePaymentParser } from './base.parser';
import { GATEWAYS } from '../constants/parser.constants';
import { FieldNormalizer } from '../services/field.normalizer';
import { ConfidenceEngine } from '../services/confidence.engine';
import { LoggerService } from '../../../core/logger/logger.service';

/**
 * GenericParser — regex-based fallback parser for unrecognized payment gateways.
 *
 * This parser attempts best-effort extraction using common patterns found
 * across payment confirmation emails. It will always "succeed" but may
 * produce low-confidence results that route to manual review.
 */
@Injectable()
export class GenericParser extends BasePaymentParser {
  constructor(
    normalizer: FieldNormalizer,
    confidenceEngine: ConfidenceEngine,
    logger: LoggerService,
  ) {
    super(normalizer, confidenceEngine, logger);
  }

  identifier = GATEWAYS.GENERIC;

  canParse(_email: any): boolean {
    return true; // Fallback — always eligible
  }

  protected extractFields(email: any): any {
    const body: string = email.body || email.text || email.html || '';

    // 1. Amount — generic INR/Rs./₹ pattern
    let amount: number | undefined;
    const amountMatch = body.match(
      /(?:INR|Rs\.?|₹|Amount)[:\s]*([\d,]+(?:\.\d{1,2})?)/i,
    );
    if (amountMatch) {
      amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    }

    // 2. Transaction / Reference ID — generic
    let transactionId: string | undefined;
    const txnMatch = body.match(
      /(?:Txn\s*(?:ID|No\.?)|Transaction\s*(?:ID|No\.?)|Reference\s*(?:ID|No\.?)|Order\s*(?:ID|No\.?))[:\s]+([a-zA-Z0-9_\-]+)/i,
    );
    if (txnMatch) transactionId = txnMatch[1];

    // 3. UTR
    let utr: string | undefined;
    const utrMatch = body.match(/UTR[:\s]+(\d{12,22})/i);
    if (utrMatch) utr = utrMatch[1];

    // 4. Student Name
    let studentName: string | undefined;
    const nameMatch = body.match(
      /(?:Student\s*Name|Name|For)[:\s]+([A-Za-z\s]{2,50})(?=\n|$|,|\r)/i,
    );
    if (nameMatch) studentName = nameMatch[1].trim();

    // 5. Admission Number
    let admissionNumber: string | undefined;
    const admMatch = body.match(
      /(?:Admission\s*No\.?|Student\s*ID|Roll\s*No\.?)[:\s]+([A-Z0-9]+)/i,
    );
    if (admMatch) admissionNumber = admMatch[1];

    // 6. Fee Month
    let feeMonth: string | undefined;
    const monthMatch = body.match(
      /(?:fee\s*(?:for|month)|month)[:\s]+([A-Za-z]+)/i,
    );
    if (monthMatch) feeMonth = monthMatch[1];

    // 7. Fee Year
    let feeYear: number | undefined;
    const yearMatch = body.match(/\b(20\d{2})\b/);
    if (yearMatch) feeYear = parseInt(yearMatch[1], 10);

    // 8. Payment Date
    let paymentDate: Date | undefined;
    const dateMatch = body.match(
      /(?:Date|Paid\s*on)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})/i,
    );
    if (dateMatch) {
      const parsed = new Date(dateMatch[1]);
      if (!isNaN(parsed.getTime())) paymentDate = parsed;
    }

    return {
      transactionId,
      utr,
      amount,
      currency: 'INR',
      studentName,
      admissionNumber,
      feeMonth,
      feeYear,
      paymentDate,
      rawData: { source: 'generic', bodySnippet: body.substring(0, 200) },
    };
  }
}
