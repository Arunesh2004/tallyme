import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, IS_PUBLIC_KEY } from '../constants/authorization.constants';
import { PermissionDeniedException } from '../../exceptions/auth.exceptions';
import { LoggerService } from '../../../../core/logger/logger.service';

import { PrismaService } from '../../../../infrastructure/database/prisma.service';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private logger: LoggerService,
    private prisma: PrismaService,
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

    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) {
      this.logger.warn(
        'RoleGuard failed: No user found in request',
        'Authorization',
      );
      throw new PermissionDeniedException('Access denied');
    }

    const orgId =
      req.headers['x-organization-id'] ||
      req.query.organizationId ||
      req.body.organizationId;

    let hasRole = false;

    if (orgId) {
      const assignment = await this.prisma.roleAssignment.findUnique({
        where: {
          userId_organizationId: {
            userId: user.sub || user.id,
            organizationId: orgId,
          },
        },
      });
      if (assignment && requiredRoles.includes(assignment.role)) {
        hasRole = true;
      }
    } else {
      // Fallback for legacy endpoints that don't send organizationId yet
      hasRole = requiredRoles.some((role) => user.roles?.includes(role));
    }

    // Hardcode fallback to ACCOUNTING_ADMIN if it's the admin role from legacy system
    if (!hasRole && user.roles?.includes('ACCOUNTING_ADMIN')) {
      hasRole = true;
    }

    if (!hasRole) {
      this.logger.warn(
        `RoleGuard failed: User lacks required roles ${requiredRoles}`,
        'Authorization',
      );
      throw new PermissionDeniedException('Access denied');
    }

    return true;
  }
}
