import { HttpException, HttpStatus } from '@nestjs/common';

export class ERPDomainException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    cause?: Error,
  ) {
    super(message, status, { cause });
  }
}

export class ERPConnectionException extends ERPDomainException {
  constructor(message: string) {
    super(message, HttpStatus.SERVICE_UNAVAILABLE);
  }
}
