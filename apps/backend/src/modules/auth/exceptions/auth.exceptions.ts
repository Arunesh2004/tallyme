import { HttpException, HttpStatus } from '@nestjs/common';

export class AuthenticationException extends HttpException {
  constructor(message: string = 'Authentication failed', cause?: Error) {
    super(message, HttpStatus.UNAUTHORIZED, { cause });
  }
}

export class AuthorizationException extends HttpException {
  constructor(message: string = 'Authorization failed', cause?: Error) {
    super(message, HttpStatus.FORBIDDEN, { cause });
  }
}

export class InvalidTokenException extends AuthenticationException {
  constructor(message: string = 'Invalid token', cause?: Error) {
    super(message, cause);
  }
}

export class ExpiredTokenException extends AuthenticationException {
  constructor(message: string = 'Token has expired', cause?: Error) {
    super(message, cause);
  }
}

export class PermissionDeniedException extends AuthorizationException {
  constructor(message: string = 'Permission denied', cause?: Error) {
    super(message, cause);
  }
}

export class UnauthenticatedException extends AuthenticationException {
  constructor(message: string = 'User is not authenticated', cause?: Error) {
    super(message, cause);
  }
}
