import { HttpException, HttpStatus } from '@nestjs/common';

export class FeeValidationDomainException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    cause?: Error,
  ) {
    super(message, status, { cause });
  }
}

export class InvalidValidationCandidateException extends FeeValidationDomainException {
  constructor(message: string) {
    super(
      `Invalid candidate for validation: ${message}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
