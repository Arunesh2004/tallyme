// src/modules/student-fee/domain/services/payment-extractor.service.ts
import { Injectable } from '@nestjs/common';
import { Result, fail, ok } from '../../../../shared/domain/result';
import { PaymentCandidate } from '../entities';
import { PaymentReference, TransactionId, PaymentAmount } from '../value-objects';
import { DecimalWrapper } from '../../../../infrastructure/prisma';
import * as crypto from 'crypto';

@Injectable()
export class EmailParser {
  // Regex heuristics to normalize HTML, find UTR numbers, amounts, etc.
  normalize(rawBody: string): string {
    return rawBody.replace(/<[^>]*>?/gm, '').trim();
  }
}

@Injectable()
export class PaymentExtractor {
  constructor(private readonly parser: EmailParser) {}

  extract(emailBody: string, senderEmail: string): Result<PaymentCandidate, string> {
    const text = this.parser.normalize(emailBody);
    
    // In reality, complex regex or Gemini AI would extract this data
    const transactionIdStr = 'TXN-' + crypto.randomUUID().slice(0, 8); // Stub
    const referenceStr = 'REF-' + crypto.randomUUID().slice(0, 8);
    const amountVal = 15000.00; // Stub
    
    try {
      const candidate = new PaymentCandidate(
        crypto.randomUUID(),
        new PaymentReference(referenceStr),
        new TransactionId(transactionIdStr),
        new PaymentAmount(new DecimalWrapper(amountVal)),
        new Date(),
        'Extracted Payer Stub',
        `Extracted from ${senderEmail}`,
        'PENDING'
      );
      
      return ok(candidate);
    } catch (e: any) {
      return fail(`Failed to instantiate PaymentCandidate: ${e.message}`);
    }
  }
}
