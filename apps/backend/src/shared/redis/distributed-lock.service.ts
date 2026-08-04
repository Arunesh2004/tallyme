import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../infrastructure/cache/redis.constants';

@Injectable()
export class DistributedLockService {
  private readonly logger = new Logger(DistributedLockService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis) {}

  /**
   * Attempts to acquire a distributed lock.
   * @param key The unique key representing the resource to lock.
   * @param token A unique string (e.g., UUID) for the owner of the lock.
   * @param ttlMs Time to live in milliseconds.
   * @returns True if lock was acquired, false otherwise.
   */
  async acquireLock(key: string, token: string, ttlMs: number): Promise<boolean> {
    try {
      const result = await this.redisClient.set(key, token, 'PX', ttlMs, 'NX');
      return result === 'OK';
    } catch (error) {
      this.logger.error(`Error acquiring lock ${key}`, (error as Error).stack);
      return false; // Fail closed
    }
  }

  /**
   * Releases the lock only if the token matches (compare-and-delete).
   * Uses a Lua script to ensure atomicity.
   * @param key The lock key.
   * @param token The owner's unique token.
   */
  async releaseLock(key: string, token: string): Promise<boolean> {
    const script = `
      if redis.call("get",KEYS[1]) == ARGV[1]
      then
          return redis.call("del",KEYS[1])
      else
          return 0
      end
    `;
    try {
      const result = await this.redisClient.eval(script, 1, key, token);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error releasing lock ${key}`, (error as Error).stack);
      return false;
    }
  }
}
