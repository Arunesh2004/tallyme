import { Global, Module } from '@nestjs/common';
import { CacheService, CacheKeyBuilder } from './cache.service';
import { CACHE_MANAGER } from './cache.constants';

@Global()
@Module({
  providers: [
    CacheKeyBuilder,
    {
      provide: CACHE_MANAGER,
      useClass: CacheService,
    },
  ],
  exports: [CACHE_MANAGER, CacheKeyBuilder],
})
export class SharedCacheModule {}
