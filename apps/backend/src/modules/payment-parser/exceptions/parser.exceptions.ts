import { HttpException, HttpStatus } from '@nestjs/common';

export class PaymentParserException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    cause?: Error,
  ) {
    super(message, status, { cause });
  }
}

export class TemplateValidationException extends PaymentParserException {
  constructor(gateway: string) {
    super(
      `Template validation failed for gateway: ${gateway}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
