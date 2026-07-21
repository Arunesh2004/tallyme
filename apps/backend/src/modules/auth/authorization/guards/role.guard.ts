import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, IS_PUBLIC_KEY } from '../constants/authorization.constants';
import { PermissionDeniedException } from '../../exceptions/auth.exceptions';
import { LoggerService } from '../../../../core/logger/logger.service';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private logger: LoggerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      this.logger.warn(
        'RoleGuard failed: No user found in request',
        'Authorization',
      );
      throw new PermissionDeniedException('Access denied');
    }

    // Since we don't have business logic, assume user.roles exists (mock for now).
    // The evaluator abstraction would be injected in a real implementation.
    const hasRole = requiredRoles.some((role) => user.roles?.includes(role));

    if (!hasRole) {
      this.logger.warn(
        `RoleGuard failed: User ${user.id} lacks required roles ${requiredRoles}`,
        'Authorization',
      );
      throw new PermissionDeniedException('Access denied');
    }

    return true;
  }
}
