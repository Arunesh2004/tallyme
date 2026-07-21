import {
  Injectable,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';
import { IRedisService } from './redis.interfaces';
import { LoggerService } from '../../core/logger/logger.service';
import { RedisConnectionException } from '../../common/exceptions/infrastructure.exceptions';

@Injectable()
export class RedisService
  implements IRedisService, OnModuleInit, OnModuleDestroy
{
  constructor(
    @Inject(REDIS_CLIENT) private readonly client: Redis,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit() {
    try {
      await this.client.connect();
      this.logger.log(
        'Successfully established connection to Redis',
        'RedisService',
      );
    } catch (error) {
      this.logger.error(
        'Failed to establish connection to Redis',
        (error as Error).stack,
        'RedisService',
      );
      throw new RedisConnectionException(
        'Could not connect to Redis at startup',
        error as Error,
      );
    }
  }

  async onModuleDestroy() {
    this.logger.log('Gracefully closing Redis connection', 'RedisService');
    this.client.disconnect();
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }
}
