import { IDecimal, Currency } from '../../types';
import { ValidationException } from '../../exceptions/ValidationException';

export abstract class ValueObject<T> {
  protected readonly props: T;

  constructor(props: T) {
    this.props = Object.freeze(props);
  }

  public equals(vo?: ValueObject<T>): boolean {
    if (vo === null || vo === undefined) {
      return false;
    }
    if (vo.props === undefined) {
      return false;
    }
    return JSON.stringify(this.props) === JSON.stringify(vo.props);
  }
}

export interface MoneyProps {
  amount: IDecimal;
  currency: Currency;
}

export class MoneyVO extends ValueObject<MoneyProps> {
  constructor(amount: IDecimal, currency: Currency = Currency.INR) {
    super({ amount, currency });
  }

  get amount(): IDecimal { return this.props.amount; }
  get currency(): Currency { return this.props.currency; }

  public add(other: MoneyVO): MoneyVO {
    if (this.currency !== other.currency) {
      throw new ValidationException('Cannot add money of different currencies');
    }
    return new MoneyVO(this.amount.plus(other.amount), this.currency);
  }
}

export interface EmailProps {
  value: string;
}

export class EmailAddress extends ValueObject<EmailProps> {
  constructor(value: string) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      throw new ValidationException('Invalid email address format');
    }
    super({ value: value.toLowerCase() });
  }
  get value(): string { return this.props.value; }
}

export interface GSTINProps {
  value: string;
}

export class GSTIN extends ValueObject<GSTINProps> {
  constructor(value: string) {
    const normalized = value.trim().toUpperCase();
    if (normalized.length !== 15) {
      throw new ValidationException('GSTIN must be 15 characters long');
    }
    super({ value: normalized });
  }
  get value(): string { return this.props.value; }
}

export interface PANProps {
  value: string;
}

export class PAN extends ValueObject<PANProps> {
  constructor(value: string) {
    const normalized = value.trim().toUpperCase();
    if (normalized.length !== 10) {
      throw new ValidationException('PAN must be 10 characters long');
    }
    super({ value: normalized });
  }
  get value(): string { return this.props.value; }
}
