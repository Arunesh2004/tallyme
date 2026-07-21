// infrastructure/email/index.ts
import { Injectable } from '@nestjs/common';
import { PaymentCandidate } from '../../domain/entities';
import { PaymentReference, TransactionId, PaymentAmount } from '../../domain/value-objects';
import { DecimalWrapper } from '../../../infrastructure/prisma';
import { ILogger } from '../../../shared/observability';

@Injectable()
export class EmailParser {
  constructor(private readonly logger: ILogger) {}

  parse(rawEmailContent: string): PaymentCandidate | null {
    this.logger.info('Parsing incoming payment email');
    
    try {
      // Stub: Regex extraction of bank email template
      const reference = new PaymentReference('REF123');
      const transactionId = new TransactionId('TXN999');
      const amount = new PaymentAmount(new DecimalWrapper('15000.00'));
      const date = new Date();

      return new PaymentCandidate(
        crypto.randomUUID(),
        reference,
        transactionId,
        amount,
        date,
        'John Doe',
        'Tuition Fee Q1'
      );
    } catch (e: any) {
      this.logger.error('Failed to parse email', e.stack);
      return null;
    }
  }
}
