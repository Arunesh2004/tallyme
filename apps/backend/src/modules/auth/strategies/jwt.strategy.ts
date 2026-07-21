import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UnauthenticatedException } from '../exceptions/auth.exceptions';
import { LoggerService } from '../../../core/logger/logger.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private logger: LoggerService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('jwt.secret') || 'fallback_secret_for_tests',
    });
    this.logger.log('JwtStrategy initialized', 'Auth');
  }

  async validate(payload: any) {
    if (!payload || !payload.sub) {
      this.logger.warn(
        'Invalid JWT payload provided to strategy',
        'JwtStrategy',
      );
      throw new UnauthenticatedException('Invalid token payload');
    }

    // Extracted payload directly translates to CurrentUser interface context
    return {
      id: payload.sub,
      email: payload.email,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
      tenantId: payload.tenantId,
    };
  }
}
