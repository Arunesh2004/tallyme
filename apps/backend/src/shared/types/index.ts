export type Brand<K, T> = K & { __brand: T };

export type UUID = Brand<string, 'UUID'>;
export type CorrelationId = Brand<string, 'CorrelationId'>;
export type TenantId = Brand<string, 'TenantId'>;

export enum Currency {
  INR = 'INR',
  USD = 'USD',
  EUR = 'EUR',
}

export interface IDecimal {
  toString(): string;
  toNumber(): number;
  plus(other: IDecimal | string | number): IDecimal;
  minus(other: IDecimal | string | number): IDecimal;
  times(other: IDecimal | string | number): IDecimal;
  div(other: IDecimal | string | number): IDecimal;
  equals(other: IDecimal | string | number): boolean;
}

export class Money {
  constructor(
    public readonly amount: IDecimal,
    public readonly currency: Currency = Currency.INR,
  ) {}
}
