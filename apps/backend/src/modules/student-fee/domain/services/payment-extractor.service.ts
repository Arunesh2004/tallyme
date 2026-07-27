// src/modules/student-fee/domain/services/payment-extractor.service.ts
import { Injectable } from '@nestjs/common';
import { Result, fail, ok } from '../../../../shared/domain/result';
import { PaymentCandidate } from '../entities';
import {
  PaymentReference,
  TransactionId,
  PaymentAmount,
} from '../value-objects';
import { DecimalWrapper } from '../../../../infrastructure/prisma';
import * as crypto from 'crypto';

/**
 * EmailParser — strips HTML and normalizes whitespace from a raw email body.
 */
@Injectable()
export class EmailParser {
  normalize(rawBody: string): string {
    // Strip HTML tags
    let text = rawBody.replace(/<[^>]*>?/gm, ' ');
    // Collapse whitespace
    text = text.replace(/\s+/g, ' ').trim();
    return text;
  }
}

/**
 * PaymentExtractor — extracts structured payment data from a normalized email body.
 *
 * This is the production extraction path consumed by the Student Fee Automation
 * workflow. It uses regex heuristics supporting common Indian payment gateways
 * (Razorpay, PayU, CCAvenue, bank NEFT/IMPS notifications).
 *
 * The extracted amount, transactionId, and reference are used to create a
 * PaymentCandidate domain entity. If the amount cannot be extracted, the
 * extraction fails and the email is routed to manual review upstream.
 *
 * IMPORTANT: No hardcoded amounts. All values are extracted from the email text.
 */
@Injectable()
export class PaymentExtractor {
  constructor(private readonly parser: EmailParser) {}

  extract(
    emailBody: string,
    senderEmail: string,
  ): Result<PaymentCandidate, string> {
    const text = this.parser.normalize(emailBody);

    // 1. Extract Amount — required field; extraction fails if missing
    const amountVal = this.extractAmount(text);
    if (amountVal === null) {
      return fail(
        `Could not extract payment amount from email (sender: ${senderEmail}). Routing to manual review.`,
      );
    }

    // 2. Extract Transaction ID — best effort
    const transactionIdStr =
      this.extractTransactionId(text) ??
      'TXN-' + crypto.randomUUID().slice(0, 8);

    // 3. Extract Reference Number — best effort
    const referenceStr =
      this.extractReference(text) ?? 'REF-' + crypto.randomUUID().slice(0, 8);

    // 4. Extract Payer name — best effort
    const payerName =
      this.extractPayerName(text) ?? `Payer from ${senderEmail}`;

    try {
      const candidate = new PaymentCandidate(
        crypto.randomUUID(),
        new PaymentReference(referenceStr),
        new TransactionId(transactionIdStr),
        new PaymentAmount(new DecimalWrapper(amountVal)),
        new Date(),
        payerName,
        `Extracted from ${senderEmail}`,
        'PENDING',
      );

      return ok(candidate);
    } catch (e: any) {
      return fail(`Failed to instantiate PaymentCandidate: ${e.message}`);
    }
  }

  /**
   * Extracts the payment amount from normalized email text.
   * Returns null if no amount can be reliably extracted.
   * Supports:  INR 15,000.00  |  Rs. 15000  |  ₹15000  |  Amount: 15000.00
   */
  private extractAmount(text: string): number | null {
    const patterns = [
      /(?:INR|Rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
      /Amount(?:\s+(?:paid|received|of))?[:\s]+(?:INR|Rs\.?|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
      /Total[:\s]+(?:INR|Rs\.?|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
      /Payment(?:\s+of)?[:\s]+(?:INR|Rs\.?|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    ];

    for (const pattern of patterns) {
      const m = text.match(pattern);
      if (m) {
        const parsed = parseFloat(m[1].replace(/,/g, ''));
        if (!isNaN(parsed) && parsed > 0) {
          return parsed;
        }
      }
    }
    return null;
  }

  /**
   * Extracts the transaction / payment ID.
   * Covers Razorpay (pay_*), PayU, NEFT/IMPS UTR, and generic labels.
   */
  private extractTransactionId(text: string): string | null {
    const patterns = [
      /\b(pay_[a-zA-Z0-9]+)\b/,
      /\b(order_[a-zA-Z0-9]+)\b/,
      /(?:Payment\s*ID|Transaction\s*ID|Txn\s*(?:ID|No\.?)|IMPS\s*Ref)[:\s]+([a-zA-Z0-9_\-]+)/i,
      /UTR[:\s]+(\d{12,22})/i,
    ];

    for (const pattern of patterns) {
      const m = text.match(pattern);
      if (m) return m[1];
    }
    return null;
  }

  /**
   * Extracts a reference / order number.
   */
  private extractReference(text: string): string | null {
    const patterns = [
      /(?:Reference\s*(?:No\.?|ID|Number)|Order\s*(?:No\.?|ID))[:\s]+([a-zA-Z0-9_\-]+)/i,
      /Ref(?:erence)?[:\s]+([a-zA-Z0-9_\-]+)/i,
    ];

    for (const pattern of patterns) {
      const m = text.match(pattern);
      if (m) return m[1];
    }
    return null;
  }

  /**
   * Extracts the payer / student name from the email.
   */
  private extractPayerName(text: string): string | null {
    const patterns = [
      /(?:Student\s*Name|Name|Dear)[:\s]+([A-Za-z\s]{2,60})(?=[,\n\r]|$)/i,
      /(?:Paid\s*by)[:\s]+([A-Za-z\s]{2,60})(?=[,\n\r]|$)/i,
    ];

    for (const pattern of patterns) {
      const m = text.match(pattern);
      if (m) {
        const name = m[1].trim();
        if (name.length >= 2) return name;
      }
    }
    return null;
  }
}
