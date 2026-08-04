import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException, HttpStatus } from '@nestjs/common';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { RedisService } from '../../cache/redis.service';

/**
 * IdempotencyInterceptor enforces exactly-once processing for mutating endpoints.
 * 
 * - TTL: 60 seconds processing lock, 24 hours success retention.
 * - Storage format: JSON string `{ status: 'PROCESSING' | 'COMPLETED', statusCode?: number, body?: any }`
 * - Collision strategy: If a second request arrives while status is 'PROCESSING', it immediately throws 409 Conflict.
 * - Cleanup strategy: If the underlying route throws an exception (e.g. 400 Bad Request), the 'PROCESSING' lock is deleted so the user can safely retry.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly redis: RedisService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    // Only apply to mutating endpoints
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)) {
      return next.handle();
    }

    const idempotencyKey = request.headers['idempotency-key'];
    
    if (!idempotencyKey) {
      throw new HttpException('Idempotency-Key header is required for mutating requests', HttpStatus.BAD_REQUEST);
    }

    const cacheKey = `idempotency:${request.user?.id || 'sys'}:${idempotencyKey}`;

    // Check if we already processed this key
    const cachedResponseStr = await this.redis.get(cacheKey);
    if (cachedResponseStr) {
      const cached = JSON.parse(cachedResponseStr);
      if (cached.status === 'PROCESSING') {
        throw new HttpException('Request is already processing (Conflict)', HttpStatus.CONFLICT);
      }
      // Return the cached successful response
      response.status(cached.statusCode);
      return of(cached.body);
    }

    // Mark as processing (lock for 60 seconds)
    await this.redis.set(cacheKey, JSON.stringify({ status: 'PROCESSING' }), 60);

    return next.handle().pipe(
      tap(async (data) => {
        // Cache the successful response for 24 hours
        await this.redis.set(
          cacheKey,
          JSON.stringify({
            status: 'COMPLETED',
            statusCode: response.statusCode,
            body: data
          }),
          86400
        );
      }),
      catchError((error) => {
        // If the request failed, we remove the lock so the client can safely retry
        // Exceptions like 400 Bad Request or 409 Conflict shouldn't permanently burn the idempotency key
        this.redis.del(cacheKey).catch(() => {});
        return throwError(() => error);
      })
    );
  }
}
