import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';

@Injectable()
export class RedisHealthIndicator {
  constructor(private readonly redisService: RedisService) {}

  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.redisService.ping();
      return result === 'PONG';
    } catch (error) {
      return false;
    }
  }
}
