import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Authorization Header');
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'CHANGE_ME_IN_PRODUCTION',
      });
    } catch (e) {
      throw new UnauthorizedException('Invalid JWT Token in Tenant Guard');
    }

    const userId = decoded.sub;
    const organizationId = decoded.organizationId;

    if (!userId || !organizationId) {
      throw new UnauthorizedException('Missing Tenant Context in Token');
    }

    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId, organizationId, status: 'ACTIVE' },
    });

    if (!membership) {
      throw new ForbiddenException(
        'User is not an active member of this organization',
      );
    }

    request.tenantContext = {
      userId,
      organizationId,
      role: membership.role,
    };

    return true;
  }
}
