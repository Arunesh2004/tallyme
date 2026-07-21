// value-objects/index.ts
import { ValueObject } from '../../../shared/domain';
import { ValidationException } from '../../../shared/exceptions/ValidationException';
import { IDecimal } from '../../../shared/types';
import { DecimalWrapper } from '../../../infrastructure/prisma';
export { GSTIN } from '../../../shared/domain/value-objects';

export class InvoiceNumber extends ValueObject<{ value: string }> {
  constructor(value: string) {
    if (!value || value.trim().length === 0) throw new ValidationException('InvoiceNumber cannot be empty');
    super({ value: value.trim() });
  }
  get value(): string { return this.props.value; }
}

export class InvoiceDate extends ValueObject<{ date: Date }> {
  constructor(date: Date) {
    if (date > new Date()) throw new ValidationException('Invoice date cannot be in the future');
    super({ date });
  }
  get date(): Date { return this.props.date; }
}

export class InvoiceAmount extends ValueObject<{ amount: IDecimal }> {
  constructor(amount: IDecimal | number) {
    const wrapped = new DecimalWrapper(amount);
    if (wrapped.toNumber() < 0) throw new ValidationException('Invoice amount cannot be negative');
    super({ amount: wrapped });
  }
  get amount(): IDecimal { return this.props.amount; }
}

export class ConfidenceScore extends ValueObject<{ score: number }> {
  constructor(score: number) {
    if (score < 0 || score > 100) throw new ValidationException('Confidence score must be between 0 and 100');
    super({ score });
  }
  get score(): number { return this.props.score; }
}
