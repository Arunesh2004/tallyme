// infrastructure/email/index.ts
import { Injectable } from '@nestjs/common';
import { PaymentCandidate } from '../domain/entities';
import {
  PaymentReference,
  TransactionId,
  PaymentAmount,
} from '../domain/value-objects';
import { DecimalWrapper } from '../../../infrastructure/prisma';
import { ILogger } from '../../../shared/observability';
import * as crypto from 'crypto';

/**
 * EmailParser (Infrastructure layer) — legacy adapter used by older parts of
 * the student-fee pipeline. Delegates extraction logic to regex heuristics.
 *
 * NOTE: The primary extraction path in Phase 12 is the domain-layer
 * PaymentExtractor service. This class exists for backward compatibility
 * with parts of the infrastructure that have not been migrated yet.
 */
@Injectable()
export class EmailParser {
  constructor(private readonly logger: ILogger) {}

  parse(rawEmailContent: string): PaymentCandidate | null {
    this.logger.info(
      'Parsing incoming payment email (infrastructure EmailParser)',
    );

    try {
      // Strip HTML and normalize
      const text = rawEmailContent
        .replace(/<[^>]*>?/gm, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Extract amount — required; return null if not found
      const amount = this.extractAmount(text);
      if (amount === null) {
        this.logger.warn(
          'Could not extract amount from email; routing to manual review',
        );
        return null;
      }

      // Extract transaction ID — best effort
      const transactionIdStr =
        this.extractTransactionId(text) ??
        'TXN-' + crypto.randomUUID().slice(0, 8);

      // Extract reference — best effort
      const referenceStr =
        this.extractReference(text) ?? 'REF-' + crypto.randomUUID().slice(0, 8);

      const reference = new PaymentReference(referenceStr);
      const transactionId = new TransactionId(transactionIdStr);
      const paymentAmount = new PaymentAmount(new DecimalWrapper(amount));
      const date = new Date();

      return new PaymentCandidate(
        crypto.randomUUID(),
        reference,
        transactionId,
        paymentAmount,
        date,
        this.extractPayerName(text) ?? 'Unknown Payer',
        'Fee Payment',
      );
    } catch (e: any) {
      this.logger.error('Failed to parse email', e.stack);
      return null;
    }
  }

  private extractAmount(text: string): number | null {
    const patterns = [
      /(?:INR|Rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
      /Amount(?:\s+(?:paid|received|of))?[:\s]+(?:INR|Rs\.?|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
      /Total[:\s]+(?:INR|Rs\.?|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    ];
    for (const pattern of patterns) {
      const m = text.match(pattern);
      if (m) {
        const val = parseFloat(m[1].replace(/,/g, ''));
        if (!isNaN(val) && val > 0) return val;
      }
    }
    return null;
  }

  private extractTransactionId(text: string): string | null {
    const m =
      text.match(/\b(pay_[a-zA-Z0-9]+|order_[a-zA-Z0-9]+)\b/) ||
      text.match(
        /(?:Payment\s*ID|Txn\s*(?:ID|No\.?)|Transaction\s*ID)[:\s]+([a-zA-Z0-9_\-]+)/i,
      ) ||
      text.match(/UTR[:\s]+(\d{12,22})/i);
    return m ? m[1] : null;
  }

  private extractReference(text: string): string | null {
    const m = text.match(
      /(?:Reference\s*(?:No\.?|ID)|Order\s*(?:No\.?|ID))[:\s]+([a-zA-Z0-9_\-]+)/i,
    );
    return m ? m[1] : null;
  }

  private extractPayerName(text: string): string | null {
    const m = text.match(
      /(?:Student\s*Name|Name|Dear)[:\s]+([A-Za-z\s]{2,60})(?=[,\n\r]|$)/i,
    );
    return m ? m[1].trim() : null;
  }
}
