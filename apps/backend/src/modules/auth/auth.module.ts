// src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { SecurityConfig } from '../../shared/config/security.config';
import { BcryptPasswordHasher } from './providers/bcrypt-password.hasher';
import { JwtTokenProvider } from './providers/jwt-token.provider';

import { isWorkerMode } from '../../shared/utils/runtime-mode';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const security = configService.get<SecurityConfig>('security');
        return {
          secret:
            security?.jwtSecret ||
            process.env.JWT_SECRET ||
            'CHANGE_ME_IN_PRODUCTION',
          signOptions: { expiresIn: (security?.jwtExpiry || '15m') as any },
        };
      },
      inject: [ConfigService],
    }),
    PrismaModule,
  ],
  controllers: isWorkerMode ? [] : [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    PermissionsGuard,
    BcryptPasswordHasher,
    JwtTokenProvider,
  ],
  exports: [AuthService, JwtAuthGuard, PermissionsGuard],
})
export class AuthModule {}
