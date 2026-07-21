import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSIONS_KEY,
  IS_PUBLIC_KEY,
} from '../constants/authorization.constants';
import { PermissionDeniedException } from '../../exceptions/auth.exceptions';
import { LoggerService } from '../../../../core/logger/logger.service';

@Injectable()
export class PermissionGuard implements CanActivate {
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

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      this.logger.warn(
        'PermissionGuard failed: No user found in request',
        'Authorization',
      );
      throw new PermissionDeniedException('Access denied');
    }

    // Placeholder check based on token payload until business logic provides evaluator
    const hasPermission = requiredPermissions.every((perm) =>
      user.permissions?.includes(perm),
    );

    if (!hasPermission) {
      this.logger.warn(
        `PermissionGuard failed: User ${user.id} lacks permissions ${requiredPermissions}`,
        'Authorization',
      );
      throw new PermissionDeniedException('Access denied');
    }

    return true;
  }
}
