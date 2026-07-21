import { BaseDomainException } from './BaseDomainException';

export class ValidationException extends BaseDomainException {
  public readonly validationErrors: Record<string, string[]>;

  constructor(
    message: string,
    validationErrors: Record<string, string[]> = {},
  ) {
    super(message, 'VALIDATION_ERROR');
    this.validationErrors = validationErrors;
  }
}
