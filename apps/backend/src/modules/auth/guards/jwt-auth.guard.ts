import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../authorization/constants/authorization.constants';
import {
  UnauthenticatedException,
  ExpiredTokenException,
} from '../exceptions/auth.exceptions';
import { LoggerService } from '../../../core/logger/logger.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private logger: LoggerService,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      if (info?.name === 'TokenExpiredError') {
        this.logger.warn(
          'Authentication failed: Expired token',
          'JwtAuthGuard',
        );
        throw new ExpiredTokenException();
      }
      this.logger.warn(
        `Authentication failed: ${info?.message || err?.message || 'Unauthorized'}`,
        'JwtAuthGuard',
      );
      throw err || new UnauthenticatedException();
    }
    return user;
  }
}
