import { Injectable } from '@nestjs/common';
import { BasePaymentParser } from './base.parser';
import { GATEWAYS } from '../constants/parser.constants';
import { FieldNormalizer } from '../services/field.normalizer';
import { ConfidenceEngine } from '../services/confidence.engine';
import { LoggerService } from '../../../core/logger/logger.service';

/**
 * RazorpayParser — extracts structured payment data from Razorpay confirmation emails.
 *
 * Razorpay email patterns supported:
 *  - Amount:        "INR 15,000.00", "Rs. 15000", "₹ 15000.00"
 *  - Transaction:   "pay_ABC123XYZ", "order_ABC123XYZ"
 *  - UTR:           "UTR: 123456789012"
 *  - Month/Year:    "for April 2026", "Fee Month: April"
 *  - Student:       "Admission No: ADM12345", "Student ID: 12345"
 *  - Name:          "Name: John Doe", "Student Name: Jane Smith"
 */
@Injectable()
export class RazorpayParser extends BasePaymentParser {
  constructor(
    normalizer: FieldNormalizer,
    confidenceEngine: ConfidenceEngine,
    logger: LoggerService,
  ) {
    super(normalizer, confidenceEngine, logger);
  }

  identifier = GATEWAYS.RAZORPAY;

  canParse(email: any): boolean {
    return (
      (email.sender && email.sender.toLowerCase().includes('razorpay.com')) ||
      (email.subject && email.subject.toLowerCase().includes('razorpay')) ||
      (email.body && email.body.toLowerCase().includes('razorpay'))
    );
  }

  protected extractFields(email: any): any {
    const body: string = email.body || email.text || email.html || '';

    // 1. Amount — handles INR/Rs./₹ with commas
    let amount: number | undefined;
    const amountPatterns = [
      /(?:INR|Rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
      /Amount(?:\s+paid)?[:\s]+(?:INR|Rs\.?|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
      /Total[:\s]+(?:INR|Rs\.?|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    ];
    for (const pattern of amountPatterns) {
      const m = body.match(pattern);
      if (m) {
        amount = parseFloat(m[1].replace(/,/g, ''));
        break;
      }
    }

    // 2. Transaction ID — Razorpay uses pay_* or order_*
    let transactionId: string | undefined;
    const txnMatch =
      body.match(
        /(?:Payment\s*ID|Transaction\s*ID|pay_id|Razorpay\s*ID)[:\s]+([a-zA-Z0-9_]+)/i,
      ) || body.match(/\b(pay_[a-zA-Z0-9]+|order_[a-zA-Z0-9]+)\b/);
    if (txnMatch) {
      transactionId = txnMatch[1];
    }

    // 3. UTR
    let utr: string | undefined;
    const utrMatch = body.match(/UTR(?:\s*No\.?|[:\s]+)(\d{12,22})/i);
    if (utrMatch) utr = utrMatch[1];

    // 4. Currency
    const currency = body.match(/\bINR\b/i) ? 'INR' : 'INR'; // Razorpay is INR-only

    // 5. Student Name
    let studentName: string | undefined;
    const nameMatch = body.match(
      /(?:Student\s*Name|Name|For)[:\s]+([A-Za-z\s]{2,50})(?=\n|$|,|\r)/i,
    );
    if (nameMatch) studentName = nameMatch[1].trim();

    // 6. Admission Number / Student ID
    let admissionNumber: string | undefined;
    const admMatch = body.match(
      /(?:Admission\s*No\.?|Adm\s*No\.?|Student\s*ID|Roll\s*No\.?)[:\s]+([A-Z0-9]+)/i,
    );
    if (admMatch) admissionNumber = admMatch[1];

    // 7. Fee Month
    let feeMonth: string | undefined;
    const monthMatch = body.match(
      /(?:fee\s*(?:for|month)|month(?:\s*of)?)[:\s]+([A-Za-z]+)/i,
    );
    if (monthMatch) feeMonth = monthMatch[1];

    // 8. Fee Year
    let feeYear: number | undefined;
    const yearMatch =
      body.match(/(?:fee\s*year|year)[:\s]+(\d{4})/i) ||
      body.match(/\b(20\d{2})\b/);
    if (yearMatch) feeYear = parseInt(yearMatch[1], 10);

    // 9. Payment Date
    let paymentDate: Date | undefined;
    const dateMatch = body.match(
      /(?:Date|Paid\s*on|Payment\s*Date)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})/i,
    );
    if (dateMatch) {
      const parsed = new Date(dateMatch[1]);
      if (!isNaN(parsed.getTime())) paymentDate = parsed;
    }

    return {
      transactionId,
      utr,
      amount,
      currency,
      studentName,
      admissionNumber,
      feeMonth,
      feeYear,
      paymentDate,
      rawData: { source: 'razorpay', bodySnippet: body.substring(0, 200) },
    };
  }
}
