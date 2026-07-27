// value-objects/index.ts
import { ValueObject } from '../../../../shared/domain';
import { ValidationException } from '../../../../shared/exceptions/ValidationException';
import { IDecimal } from '../../../../shared/types';
import { DecimalWrapper } from '../../../../infrastructure/prisma';
export { GSTIN } from '../../../../shared/domain/value-objects';

export class ExtractedField<T> extends ValueObject<{
  value: T | null;
  confidence: number;
  sourceText: string;
}> {
  constructor(value: T | null, confidence: number, sourceText: string) {
    if (confidence < 0 || confidence > 100) {
      throw new ValidationException(
        'Confidence score must be between 0 and 100',
      );
    }
    super({ value, confidence, sourceText });
  }

  get value(): T | null {
    return this.props.value;
  }

  get confidence(): number {
    return this.props.confidence;
  }

  get sourceText(): string {
    return this.props.sourceText;
  }
}

export class ExtractedGSTIN extends ExtractedField<string> {
  constructor(value: string | null, confidence: number, sourceText: string) {
    super(value ? value.trim() : null, confidence, sourceText);
  }
}

export class ExtractedVendorName extends ExtractedField<string> {
  constructor(value: string | null, confidence: number, sourceText: string) {
    super(value ? value.trim() : null, confidence, sourceText);
  }
}

export class InvoiceNumber extends ExtractedField<string> {
  constructor(value: string | null, confidence: number, sourceText: string) {
    super(value ? value.trim() : null, confidence, sourceText);
  }
}

export class InvoiceDate extends ExtractedField<Date> {
  constructor(date: Date | null, confidence: number, sourceText: string) {
    if (date && date > new Date('2030-01-01')) {
      throw new ValidationException('Invoice date cannot be in the future');
    }
    super(date, confidence, sourceText);
  }
}

export class InvoiceAmount extends ExtractedField<IDecimal> {
  constructor(
    amount: IDecimal | number | null,
    confidence: number,
    sourceText: string,
  ) {
    let wrapped: IDecimal | null = null;
    if (amount !== null && amount !== undefined) {
      wrapped = new DecimalWrapper(amount);
      if (wrapped.toNumber() < 0) {
        throw new ValidationException('Invoice amount cannot be negative');
      }
    }
    super(wrapped, confidence, sourceText);
  }
}

export class ExtractedSubtotal extends InvoiceAmount {}
export class ExtractedTax extends InvoiceAmount {}

export class ConfidenceScore extends ValueObject<{ score: number }> {
  constructor(score: number) {
    if (score < 0 || score > 100)
      throw new ValidationException(
        'Confidence score must be between 0 and 100',
      );
    super({ score });
  }
  get score(): number {
    return this.props.score;
  }
}
