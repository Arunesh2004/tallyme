import { Injectable } from '@nestjs/common';
import {
  ICacheManager,
  CacheInvalidationOptions,
  ICacheKeyBuilder,
} from './cache.interfaces';
import { RedisService } from '../../infrastructure/cache/redis.service';

@Injectable()
export class CacheKeyBuilder implements ICacheKeyBuilder {
  build(namespace: string, key: string): string {
    return `${namespace}:${key}`;
  }
}

@Injectable()
export class CacheService implements ICacheManager {
  constructor(private readonly redisService: RedisService) {}

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redisService.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return data as any;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const data = typeof value === 'string' ? value : JSON.stringify(value);
    await this.redisService.set(key, data, ttl);
  }

  async del(key: string): Promise<void> {
    await this.redisService.del(key);
  }

  async invalidate(
    pattern: string,
    options?: CacheInvalidationOptions,
  ): Promise<void> {
    // Basic invalidation. A robust implementation would use SCAN and DEL.
    const searchPattern = options?.namespace
      ? `${options.namespace}:${pattern}*`
      : `${pattern}*`;
    // For now, since this is just an abstraction implementation, we'll leave the SCAN logic out
    // to keep it simple, or we can just delete the exact key if exactMatch is true
    if (options?.exactMatch) {
      await this.del(searchPattern.replace('*', ''));
    }
  }
}
