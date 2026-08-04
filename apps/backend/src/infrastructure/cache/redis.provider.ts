import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';
import { LoggerService } from '../../core/logger/logger.service';

export const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: (configService: ConfigService, logger: LoggerService) => {
    const host = configService.get<string>('redis.host');
    const port = configService.get<number>('redis.port');
    const password = configService.get<string>('redis.password');
    const db = configService.get<number>('redis.db');
    const keyPrefix = configService.get<string>('redis.keyPrefix');

    const client = new Redis({
      host,
      port,
      password,
      db,
      family: 4,
      lazyConnect: true, // Let the service handle connection during onModuleInit
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay; // Never stop retrying to prevent BullMQ crashes
      },
    });

    client.on('error', (err: Error) => {
      logger.error('Redis connection error', err.stack, 'RedisProvider');
    });

    client.on('close', () => {
      logger.warn('Redis connection closed', 'RedisProvider');
    });

    return client;
  },
  inject: [ConfigService, LoggerService],
};
