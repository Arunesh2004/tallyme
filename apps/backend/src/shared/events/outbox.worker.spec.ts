import { Test, TestingModule } from '@nestjs/testing';
import { OutboxWorker } from './outbox.worker';
import { PrismaService } from '../../infrastructure/prisma';
import { QueueRegistry } from '../../infrastructure/queue/bullmq';

// The ILogger parameter is injected as a plain interface without @Inject token,
// so we provide it via the LOGGER_SERVICE token pattern, or just bypass NestJS DI
// by constructing the worker directly.
describe('OutboxWorker (shared)', () => {
  let worker: OutboxWorker;

  beforeEach(() => {
    const prisma = {} as any;
    const queue = { getQueue: jest.fn() } as any;
    const logger = { log: jest.fn(), error: jest.fn(), debug: jest.fn(), warn: jest.fn() } as any;

    // Bypass NestJS DI since ILogger has no injection token - construct directly
    worker = new OutboxWorker(prisma, queue, logger);
  });

  it('should process empty outbox without error', async () => {
    await expect(worker.processOutbox()).resolves.not.toThrow();
  });
});
