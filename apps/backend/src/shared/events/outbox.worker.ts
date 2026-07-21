// src/shared/events/outbox.worker.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma';
import { QueueRegistry } from '../../infrastructure/queue/bullmq';
import { ILogger } from '../observability';

@Injectable()
export class OutboxWorker implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueRegistry,
    private readonly logger: ILogger
  ) {}

  onModuleInit() {
    setInterval(() => this.processOutbox(), 5000);
  }

  async processOutbox() {
    // 1. Fetch PENDING outbox events
    // const events = await this.prisma.client.outboxEvent.findMany({ where: { status: 'PENDING' }, take: 100 });
    const events: any[] = []; // Stub

    for (const event of events) {
      try {
        // 2. Dispatch to BullMQ
        const targetQueue = this.queue.getQueue(event.topic);
        await targetQueue.add(event.name, event.payload, { jobId: event.id });

        // 3. Mark as PUBLISHED
        // await this.prisma.client.outboxEvent.update({ where: { id: event.id }, data: { status: 'PUBLISHED' } });
      } catch (error) {
        this.logger.error(`Failed to publish Outbox event ${event.id}`, error);
        // Will retry on next tick
      }
    }
  }
}
