// src/modules/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { LoggerService } from '../../core/logger/logger.service';
import { SecurityConfig } from '../../shared/config/security.config';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
    // 1. Find the user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: { permissions: true },
        },
      },
    });

    if (!user || !user.isActive) {
      this.logger.warn(
        `Login attempt for unknown or inactive user: ${email}`,
        'AuthService',
      );
      await this.prisma.auditLog.create({
        data: {
          action: 'LOGIN_FAILED',
          entity: 'User',
          reason: 'Unknown or inactive user',
          oldValue: { email },
        },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Compare password with bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      this.logger.warn(`Invalid password for user: ${email}`, 'AuthService');
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          organizationId: user.organizationId,
          companyId: user.companyId,
          action: 'LOGIN_FAILED',
          entity: 'User',
          entityId: user.id,
          reason: 'Invalid password',
        },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.companyId) {
      this.logger.warn(
        `User ${email} has no associated company`,
        'AuthService',
      );
      throw new UnauthorizedException(
        'User is not associated with any company',
      );
    }

    // 3. Build permissions list from role
    const permissions = user.role.permissions.map((p: any) => p.action);

    // 4. Sign JWT access token
    const payload = {
      sub: user.id,
      email: user.email,
      roles: [user.role.name],
      permissions,
      tenantId: user.companyId,
    };

    const security = this.configService.get<SecurityConfig>('security');
    const accessToken = await this.jwtService.signAsync(payload as any, {
      secret: security?.jwtSecret || process.env.JWT_SECRET,
      expiresIn: (security?.jwtExpiry || '15m') as any,
    });

    // 5. Create refresh token (opaque, store hash in DB)
    const rawRefreshToken = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshToken: rawRefreshToken,
        expiresAt,
      },
    });

    this.logger.log(`User ${email} logged in successfully`, 'AuthService');

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        organizationId: user.organizationId,
        companyId: user.companyId,
        action: 'LOGIN_SUCCESS',
        entity: 'User',
        entityId: user.id,
        reason: 'User logged in successfully',
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role.name,
        permissions,
      },
    };
  }

  async refresh(rawRefreshToken: string): Promise<LoginResult> {
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    // Find session
    const session = await this.prisma.session.findUnique({
      where: { refreshToken: rawRefreshToken },
      include: {
        user: {
          include: {
            role: { include: { permissions: true } },
          },
        },
      },
    });

    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      this.logger.warn('Invalid or expired refresh token used', 'AuthService');
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!session.user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    // Revoke the old session (rotation)
    await this.prisma.session.update({
      where: { id: session.id },
      data: { isRevoked: true },
    });

    const permissions = session.user.role.permissions.map((p: any) => p.action);
    const payload = {
      sub: session.user.id,
      email: session.user.email,
      roles: [session.user.role.name],
      permissions,
      tenantId: session.user.companyId,
    };

    const security = this.configService.get<SecurityConfig>('security');
    const accessToken = await this.jwtService.signAsync(payload as any, {
      secret: security?.jwtSecret || process.env.JWT_SECRET,
      expiresIn: (security?.jwtExpiry || '15m') as any,
    });

    // Create new refresh token
    const newRawRefreshToken = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.session.create({
      data: {
        userId: session.user.id,
        refreshToken: newRawRefreshToken,
        expiresAt,
      },
    });

    this.logger.log(
      `Refresh token rotated for user ${session.user.email}`,
      'AuthService',
    );

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
      user: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role.name,
        permissions,
      },
    };
  }

  async logout(userId: string, rawRefreshToken: string): Promise<void> {
    if (rawRefreshToken) {
      await this.prisma.session
        .updateMany({
          where: { userId, refreshToken: rawRefreshToken, isRevoked: false },
          data: { isRevoked: true },
        })
        .catch(() => {
          // Silently ignore if session not found on logout
        });
    }
    this.logger.log(`User ${userId} logged out`, 'AuthService');
  }

  async bootstrap(dto: any): Promise<{ message: string }> {
    try {
      // 1. Security Check: Invariant is User count == 0
      const userCount = await this.prisma.user.count();
    if (userCount > 0) {
      this.logger.warn('Bootstrap attempted but system is already initialized', 'AuthService');
      throw new ForbiddenException('System is already initialized');
    }

    // 2. Hash Password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // 3. Execute inside a single Prisma transaction
    await this.prisma.$transaction(async (tx) => {
      // Create Organization
      const org = await tx.organization.create({
        data: {
          name: dto.organizationName,
          slug: dto.organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        },
      });

      // Create Company
      const company = await tx.company.create({
        data: {
          name: dto.companyName,
          organizationId: org.id,
        },
      });

      // Upsert Role and seed required permissions for Vendor Pipeline
      const role = await tx.role.upsert({
        where: { name: 'ACCOUNTING_ADMIN' },
        update: {
          permissions: {
            connectOrCreate: [
              { where: { action: 'Invoice.Upload' }, create: { action: 'Invoice.Upload' } },
              { where: { action: 'Invoice.Process' }, create: { action: 'Invoice.Process' } },
            ],
          },
        },
        create: { 
          name: 'ACCOUNTING_ADMIN',
          permissions: {
            connectOrCreate: [
              { where: { action: 'Invoice.Upload' }, create: { action: 'Invoice.Upload' } },
              { where: { action: 'Invoice.Process' }, create: { action: 'Invoice.Process' } },
            ],
          },
        },
      });

      // Create User
      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          isActive: true,
          roleId: role.id,
          organizationId: org.id,
          companyId: company.id,
        },
      });

      // Assign Role
      await tx.roleAssignment.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          role: 'ACCOUNTING_ADMIN',
        },
      });

      this.logger.log(`Bootstrap successful for ${dto.email}`, 'AuthService');
    });

    return { message: 'Bootstrap successful' };
    } catch (error) {
      console.error('BOOTSTRAP ERROR:', error);
      throw error;
    }
  }
}
