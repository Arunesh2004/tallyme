import { IdempotencyInterceptor } from './idempotency.interceptor';
import { RedisService } from '../../cache/redis.service';
import { ExecutionContext, CallHandler, HttpException } from '@nestjs/common';
import { of, throwError, firstValueFrom } from 'rxjs';

describe('IdempotencyInterceptor', () => {
  let interceptor: IdempotencyInterceptor;
  let mockRedis: jest.Mocked<RedisService>;
  let mockContext: any;
  let mockCallHandler: any;

  beforeEach(() => {
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    } as any;

    interceptor = new IdempotencyInterceptor(mockRedis);

    mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          method: 'POST',
          headers: { 'idempotency-key': 'key-123' },
          user: { id: 'user-1' }
        }),
        getResponse: jest.fn().mockReturnValue({
          statusCode: 200,
          status: jest.fn()
        })
      })
    };

    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({ data: 'success' }))
    };
  });

  it('✓ requires Idempotency-Key for mutating requests', async () => {
    mockContext.switchToHttp().getRequest().headers = {}; // Remove key
    
    await expect(interceptor.intercept(mockContext, mockCallHandler)).rejects.toThrow(HttpException);
  });

  it('✓ returns cached response for duplicate request', async () => {
    mockRedis.get.mockResolvedValueOnce(JSON.stringify({
      status: 'COMPLETED',
      statusCode: 201,
      body: { data: 'already-done' }
    }));

    const result$ = await interceptor.intercept(mockContext, mockCallHandler);
    const result = await firstValueFrom(result$);
    
    expect(result).toEqual({ data: 'already-done' });
    expect(mockCallHandler.handle).not.toHaveBeenCalled();
  });

  it('✓ prevents race conditions by rejecting if PROCESSING', async () => {
    mockRedis.get.mockResolvedValueOnce(JSON.stringify({ status: 'PROCESSING' }));

    await expect(interceptor.intercept(mockContext, mockCallHandler)).rejects.toThrow(HttpException);
    expect(mockCallHandler.handle).not.toHaveBeenCalled();
  });

  it('✓ deletes lock if handler throws error (cleanup strategy)', async () => {
    mockRedis.get.mockResolvedValueOnce(null);
    mockCallHandler.handle.mockReturnValue(throwError(() => new HttpException('Bad Request', 400)));

    const result$ = await interceptor.intercept(mockContext, mockCallHandler);
    
    await expect(firstValueFrom(result$)).rejects.toThrow();
    expect(mockRedis.del).toHaveBeenCalledWith('idempotency:user-1:key-123');
  });

  it('✓ caches success response (24h TTL)', async () => {
    mockRedis.get.mockResolvedValueOnce(null);
    const result$ = await interceptor.intercept(mockContext, mockCallHandler);
    await firstValueFrom(result$);

    expect(mockRedis.set).toHaveBeenCalledWith(
      'idempotency:user-1:key-123',
      expect.stringContaining('COMPLETED'),
      86400
    );
  });
});
