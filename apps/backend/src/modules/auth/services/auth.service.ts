import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { BcryptPasswordHasher } from '../providers/bcrypt-password.hasher';
import { JwtTokenProvider } from '../providers/jwt-token.provider';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordHasher: BcryptPasswordHasher,
    private readonly tokenProvider: JwtTokenProvider
  ) {}

  async login(email: string, passwordPlain: string, device: string, ip: string) {
    this.logger.log(`Attempting login for ${email}`);

    const user = await this.prisma.userAccount.findUnique({ 
      where: { email },
      include: { memberships: true }
    });
    
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials or inactive account');
    }

    if (user.failedAttempts >= 5) {
      await this.prisma.userAccount.update({ where: { id: user.id }, data: { status: 'LOCKED' } });
      throw new UnauthorizedException('Account locked due to too many failed attempts.');
    }

    const valid = await this.passwordHasher.compare(passwordPlain, user.passwordHash);

    if (!valid) {
      await this.prisma.userAccount.update({ where: { id: user.id }, data: { failedAttempts: user.failedAttempts + 1 } });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.userAccount.update({ where: { id: user.id }, data: { failedAttempts: 0, lastLogin: new Date() } });

    const organizationId = user.memberships[0]?.organizationId || user.organizationId;
    const role = user.memberships[0]?.role || 'VIEW_ONLY';

    const payload = {
      sub: user.id,
      email: user.email,
      organizationId,
      role
    };

    const accessToken = await this.tokenProvider.signToken(payload);
    const refreshToken = crypto.randomBytes(40).toString('hex');

    await this.prisma.userSession.create({
      data: {
        userId: user.id,
        device,
        ip,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) 
      }
    });

    return { 
      accessToken, 
      refreshToken, 
      user: { id: user.id, email: user.email, name: user.name },
      organization: { id: organizationId }
    };
  }

  async refresh(refreshToken: string) {
    const session = await this.prisma.userSession.findUnique({ where: { refreshToken } });
    if (!session || session.expiresAt < new Date()) {
      if (session) await this.prisma.userSession.delete({ where: { id: session.id } });
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.userAccount.findUnique({ 
      where: { id: session.userId },
      include: { memberships: true }
    });
    
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User account inactive');
    }

    const organizationId = user.memberships[0]?.organizationId || user.organizationId;
    const role = user.memberships[0]?.role || 'VIEW_ONLY';

    const payload = {
      sub: user.id,
      email: user.email,
      organizationId,
      role
    };

    const newAccessToken = await this.tokenProvider.signToken(payload);
    const newRefreshToken = crypto.randomBytes(40).toString('hex');

    await this.prisma.userSession.update({
      where: { id: session.id },
      data: {
        refreshToken: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    return { 
      accessToken: newAccessToken, 
      refreshToken: newRefreshToken,
      user: { id: user.id, email: user.email, name: user.name }
    };
  }

  async logout(userId: string, refreshToken: string) {
    if (refreshToken) {
      await this.prisma.userSession.deleteMany({
        where: { userId, refreshToken }
      });
    }
  }
}
