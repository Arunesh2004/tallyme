// value-objects/index.ts
import { ValueObject } from '../../../shared/domain';
import { ValidationException } from '../../../shared/exceptions/ValidationException';
import { IDecimal } from '../../../shared/types';
import { DecimalWrapper } from '../../../infrastructure/prisma';

export class PaymentReference extends ValueObject<{ value: string }> {
  constructor(value: string) {
    if (!value || value.trim().length === 0)
      throw new ValidationException('PaymentReference cannot be empty');
    super({ value: value.trim() });
  }
  get value(): string {
    return this.props.value;
  }
}

export class TransactionId extends ValueObject<{ value: string }> {
  constructor(value: string) {
    if (!value || value.trim().length === 0)
      throw new ValidationException('TransactionId cannot be empty');
    super({ value: value.trim() });
  }
  get value(): string {
    return this.props.value;
  }
}

export class StudentRollNumber extends ValueObject<{ value: string }> {
  constructor(value: string) {
    if (!value || value.trim().length === 0)
      throw new ValidationException('RollNumber cannot be empty');
    super({ value: value.trim().toUpperCase() });
  }
  get value(): string {
    return this.props.value;
  }
}

export class PaymentAmount extends ValueObject<{ amount: IDecimal }> {
  constructor(amount: IDecimal | number) {
    const wrappedAmount = new DecimalWrapper(amount);
    if (wrappedAmount.toNumber() <= 0)
      throw new ValidationException('PaymentAmount must be greater than zero');
    super({ amount: wrappedAmount });
  }
  get amount(): IDecimal {
    return this.props.amount;
  }
}
