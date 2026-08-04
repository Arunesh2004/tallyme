import { Test, TestingModule } from '@nestjs/testing';
import { DistributedLockService } from './distributed-lock.service';
import { REDIS_CLIENT } from '../../infrastructure/cache/redis.constants';

describe('DistributedLockService', () => {
  let service: DistributedLockService;
  let redisClient: any;

  beforeEach(async () => {
    redisClient = {
      set: jest.fn(),
      eval: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DistributedLockService,
        { provide: REDIS_CLIENT, useValue: redisClient },
      ],
    }).compile();

    service = module.get<DistributedLockService>(DistributedLockService);
  });

  describe('acquireLock', () => {
    it('should return true if redis SET NX returns OK', async () => {
      redisClient.set.mockResolvedValue('OK');
      const result = await service.acquireLock('my-key', 'token1', 5000);
      expect(result).toBe(true);
      expect(redisClient.set).toHaveBeenCalledWith('my-key', 'token1', 'PX', 5000, 'NX');
    });

    it('should return false if redis SET NX returns null (already locked)', async () => {
      redisClient.set.mockResolvedValue(null);
      const result = await service.acquireLock('my-key', 'token1', 5000);
      expect(result).toBe(false);
    });

    it('should return false and log error on exception', async () => {
      redisClient.set.mockRejectedValue(new Error('Redis connection down'));
      const result = await service.acquireLock('my-key', 'token1', 5000);
      expect(result).toBe(false);
    });
  });

  describe('releaseLock', () => {
    it('should return true if eval returns 1 (lock deleted)', async () => {
      redisClient.eval.mockResolvedValue(1);
      const result = await service.releaseLock('my-key', 'token1');
      expect(result).toBe(true);
      expect(redisClient.eval).toHaveBeenCalledWith(expect.any(String), 1, 'my-key', 'token1');
    });

    it('should return false if eval returns 0 (token mismatch or missing)', async () => {
      redisClient.eval.mockResolvedValue(0);
      const result = await service.releaseLock('my-key', 'token1');
      expect(result).toBe(false);
    });

    it('should return false and log error on exception', async () => {
      redisClient.eval.mockRejectedValue(new Error('Redis error'));
      const result = await service.releaseLock('my-key', 'token1');
      expect(result).toBe(false);
    });
  });
});
