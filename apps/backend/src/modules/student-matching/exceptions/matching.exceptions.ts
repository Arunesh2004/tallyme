import { HttpException, HttpStatus } from '@nestjs/common';

export class MatchingDomainException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    cause?: Error,
  ) {
    super(message, status, { cause });
  }
}

export class InvalidMatchingCandidateException extends MatchingDomainException {
  constructor(message: string) {
    super(
      `Invalid candidate for matching: ${message}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
