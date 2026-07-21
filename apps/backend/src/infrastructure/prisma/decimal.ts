import { Prisma } from '@prisma/client';
import { IDecimal } from '../../shared/types';

/**
 * Concrete implementation of IDecimal using Prisma.Decimal.
 * Completely isolates the domain from javascript floating-point arithmetic.
 */
export class DecimalWrapper implements IDecimal {
  private readonly value: Prisma.Decimal;

  constructor(value: Prisma.Decimal | string | number | IDecimal) {
    if (value instanceof DecimalWrapper) {
      this.value = value.value;
    } else if (typeof value === 'object' && 'toNumber' in value) {
      this.value = new Prisma.Decimal(value.toString());
    } else {
      this.value = new Prisma.Decimal(
        value as string | number | Prisma.Decimal,
      );
    }
  }

  toString(): string {
    return this.value.toString();
  }

  toNumber(): number {
    return this.value.toNumber();
  }

  plus(other: IDecimal | string | number): IDecimal {
    return new DecimalWrapper(this.value.plus(new DecimalWrapper(other).value));
  }

  minus(other: IDecimal | string | number): IDecimal {
    return new DecimalWrapper(
      this.value.minus(new DecimalWrapper(other).value),
    );
  }

  times(other: IDecimal | string | number): IDecimal {
    return new DecimalWrapper(
      this.value.times(new DecimalWrapper(other).value),
    );
  }

  div(other: IDecimal | string | number): IDecimal {
    return new DecimalWrapper(
      this.value.dividedBy(new DecimalWrapper(other).value),
    );
  }

  equals(other: IDecimal | string | number): boolean {
    return this.value.equals(new DecimalWrapper(other).value);
  }
}
