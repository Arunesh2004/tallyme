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
      keyPrefix,
      lazyConnect: true, // Let the service handle connection during onModuleInit
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        if (times > 5) {
          logger.error(
            'Redis retry strategy exhausted after 5 attempts',
            undefined,
            'RedisProvider',
          );
          return null; // Stop retrying
        }
        return delay;
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
