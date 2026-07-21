// Result.ts
export type Result<T, E> = Success<T, E> | Failure<T, E>;

export class Success<T, E> {
  public readonly isSuccess = true;
  public readonly isFailure = false;

  constructor(public readonly value: T) {}

  map<U>(fn: (val: T) => U): Result<U, E> {
    return new Success<U, E>(fn(this.value));
  }

  flatMap<U>(fn: (val: T) => Result<U, E>): Result<U, E> {
    return fn(this.value);
  }

  match<U>(cases: { onSuccess: (val: T) => U; onFailure: (err: E) => U }): U {
    return cases.onSuccess(this.value);
  }

  unwrap(): T {
    return this.value;
  }

  unwrapOr(defaultValue: T): T {
    return this.value;
  }
}

export class Failure<T, E> {
  public readonly isSuccess = false;
  public readonly isFailure = true;

  constructor(public readonly error: E) {}

  map<U>(fn: (val: T) => U): Result<U, E> {
    return new Failure<U, E>(this.error);
  }

  flatMap<U>(fn: (val: T) => Result<U, E>): Result<U, E> {
    return new Failure<U, E>(this.error);
  }

  match<U>(cases: { onSuccess: (val: T) => U; onFailure: (err: E) => U }): U {
    return cases.onFailure(this.error);
  }

  unwrap(): T {
    throw new Error('Called unwrap on a Failure');
  }

  unwrapOr(defaultValue: T): T {
    return defaultValue;
  }
}

export const ok = <T, E>(value: T): Result<T, E> => new Success(value);
export const fail = <T, E>(error: E): Result<T, E> => new Failure(error);
