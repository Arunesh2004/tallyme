// bullmq/index.ts
import { Injectable, Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface QueueConfig {
  name: string;
  redisUrl: string;
  concurrency: number;
}

export interface QueueProvider {
  getQueue(name: string): any; // BullMQ.Queue placeholder
}

@Injectable()
export class QueueRegistry implements QueueProvider {
  private queues: Map<string, any> = new Map();

  register(name: string, queue: any): void {
    this.queues.set(name, queue);
  }

  getQueue(name: string): any {
    return this.queues.get(name);
  }

  getAll(): any[] {
    return Array.from(this.queues.values());
  }
}

@Injectable()
export class QueueHealth {
  constructor(private readonly registry: QueueRegistry) {}

  async checkHealth(): Promise<any> {
    const status: any = {};
    for (const q of this.registry.getAll()) {
      status[q.name] = {
        waiting: await q.getWaitingCount(),
        active: await q.getActiveCount(),
        failed: await q.getFailedCount(),
      };
    }
    return status;
  }
}

@Global()
@Module({
  providers: [QueueRegistry, QueueHealth],
  exports: [QueueRegistry, QueueHealth]
})
export class BullMQModule {}
