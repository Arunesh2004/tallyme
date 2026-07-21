import {
  IBasePaymentParser,
  PaymentCandidateDomain,
} from '../interfaces/parser.interfaces';
import { FieldNormalizer } from '../services/field.normalizer';
import { ConfidenceEngine } from '../services/confidence.engine';
import { LoggerService } from '../../../core/logger/logger.service';

export abstract class BasePaymentParser implements IBasePaymentParser {
  abstract identifier: string;

  constructor(
    protected readonly normalizer: FieldNormalizer,
    protected readonly confidenceEngine: ConfidenceEngine,
    protected readonly logger: LoggerService,
  ) {}

  abstract canParse(email: any): boolean;

  protected abstract extractFields(email: any): Partial<PaymentCandidateDomain>;

  async parse(email: any): Promise<PaymentCandidateDomain> {
    this.logger.debug(
      `Parsing email ${email.messageId} using ${this.identifier} parser`,
      'BasePaymentParser',
    );

    const extracted = this.extractFields(email);

    // Normalize fields
    extracted.amount = this.normalizer.normalizeAmount(extracted.amount);
    extracted.currency = this.normalizer.normalizeCurrency(extracted.currency);
    extracted.studentName = this.normalizer.normalizeString(
      extracted.studentName,
    );
    extracted.admissionNumber = this.normalizer.normalizeString(
      extracted.admissionNumber,
    );
    extracted.utr = this.normalizer.normalizeString(extracted.utr);
    extracted.transactionId = this.normalizer.normalizeString(
      extracted.transactionId,
    );

    // Confidence & Missing Fields
    const missingFields = this.normalizer.detectMissingFields(extracted);
    const confidence = this.confidenceEngine.calculate(extracted);

    return {
      gateway: this.identifier,
      transactionId: extracted.transactionId || null,
      utr: extracted.utr || null,
      referenceNumber: extracted.referenceNumber || null,
      amount: extracted.amount || null,
      currency: extracted.currency || null,
      studentName: extracted.studentName || null,
      admissionNumber: extracted.admissionNumber || null,
      feeMonth: extracted.feeMonth || null,
      feeYear: extracted.feeYear || null,
      paymentDate: extracted.paymentDate || null,
      emailId: email.id,
      sender: email.sender,
      subject: email.subject,
      confidence,
      missingFields,
      rawData: extracted.rawData || {},
    };
  }
}
