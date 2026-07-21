import { HttpException, HttpStatus } from '@nestjs/common';

export class MailDomainException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    cause?: Error,
  ) {
    super(message, status, { cause });
  }
}

export class DuplicateEmailException extends MailDomainException {
  constructor(messageId: string) {
    super(
      `Email with Message-ID ${messageId} is already processed`,
      HttpStatus.CONFLICT,
    );
  }
}

export class EmailParsingException extends MailDomainException {
  constructor(message: string, cause?: Error) {
    super(
      `Failed to parse email: ${message}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      cause,
    );
  }
}
