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
