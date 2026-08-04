// src/modules/auth/guards/permissions.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { SetMetadata } from '@nestjs/common';
export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true; // No permissions required
    }

    const req = context.switchToHttp().getRequest();
    const { user } = req;

    // SAFE LOGGING
    console.log('[PermissionsGuard] Path:', req.path);
    console.log(
      '[PermissionsGuard] Headers present:',
      Object.keys(req.headers),
    );
    console.log('[PermissionsGuard] User present:', !!user);
    if (user) {
      console.log('[PermissionsGuard] User permissions:', user.permissions);
    }

    if (!user || !user.permissions) {
      console.log(
        '[PermissionsGuard] REJECT: Insufficient permissions (no user or permissions)',
      );
      throw new ForbiddenException('Insufficient permissions');
    }

    const hasPermission = requiredPermissions.every(
      (permission) =>
        user.permissions.includes(permission) || user.permissions.includes('*'),
    );

    if (!hasPermission) {
      console.log(
        '[PermissionsGuard] REJECT: Insufficient permissions (missing required permission)',
        requiredPermissions,
      );
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
