import { PrismaClient } from '@prisma/client';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';

// Store global references to cleanly close them
declare global {
  var __PRISMA__: PrismaClient;
  var __REDIS__: Redis;
  var __WORKERS__: Worker[];
}

afterAll(async () => {
  // Prisma Cleanup
  if (global.__PRISMA__) {
    await global.__PRISMA__.$disconnect();
  }

  // Redis Cleanup
  if (global.__REDIS__) {
    await global.__REDIS__.quit();
  }

  // BullMQ Cleanup
  if (global.__WORKERS__) {
    for (const worker of global.__WORKERS__) {
      await worker.close();
      await worker.disconnect();
    }
  }

  // General GC for active timers
  jest.clearAllTimers();
});
