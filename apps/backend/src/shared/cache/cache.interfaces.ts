export interface CacheInvalidationOptions {
  namespace?: string;
  exactMatch?: boolean;
}

export interface ICacheManager {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  invalidate(
    pattern: string,
    options?: CacheInvalidationOptions,
  ): Promise<void>;
}

export interface ICacheKeyBuilder {
  build(namespace: string, key: string): string;
}
