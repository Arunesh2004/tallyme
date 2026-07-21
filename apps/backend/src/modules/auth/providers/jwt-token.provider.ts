import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ITokenProvider } from '../interfaces/token-provider.interface';
import { LoggerService } from '../../../core/logger/logger.service';

@Injectable()
export class JwtTokenProvider implements ITokenProvider {
  constructor(
    private readonly jwtService: JwtService,
    private readonly logger: LoggerService,
  ) {}

  async signToken(payload: any): Promise<string> {
    this.logger.debug('Signing JWT token', 'JwtTokenProvider');
    return this.jwtService.signAsync(payload);
  }

  async verifyToken(token: string): Promise<any> {
    try {
      return await this.jwtService.verifyAsync(token);
    } catch (error) {
      this.logger.warn('Token verification failed', 'JwtTokenProvider');
      throw error;
    }
  }
}
