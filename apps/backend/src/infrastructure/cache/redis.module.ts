import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { redisProvider } from './redis.provider';

import { DistributedLockService } from '../../shared/redis/distributed-lock.service';

@Global()
@Module({
  providers: [redisProvider, RedisService, DistributedLockService],
  exports: [RedisService, DistributedLockService],
})
export class RedisModule {}
