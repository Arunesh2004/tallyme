import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Queue, JobsOptions } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../core/logger/logger.service';
import { IQueueService } from './queue.interfaces';
import { REDIS_CLIENT } from '../cache/redis.constants';
import { ModuleRef } from '@nestjs/core';
import { RequestContextService } from '../../core/context/request-context.service';

@Injectable()
export class BullMqService
  implements IQueueService, OnModuleInit, OnModuleDestroy
{
  private queues: Map<string, Queue> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly moduleRef: ModuleRef,
  ) {}

  async onModuleInit() {
    this.logger.log(
      'Initializing BullMQ Service infrastructure',
      'BullMqService',
    );
    // Actual queues will be registered dynamically or via providers later.
  }

  async onModuleDestroy() {
    this.logger.log('Closing all BullMQ queues', 'BullMqService');
    for (const [name, queue] of this.queues.entries()) {
      await queue.close();
      this.logger.log(`Closed queue: ${name}`, 'BullMqService');
    }
  }

  /**
   * Registers a queue lazily if it doesn't exist yet, reusing the global Redis connection.
   */
  private getOrCreateQueue(queueName: string): Queue {
    if (this.queues.has(queueName)) {
      return this.queues.get(queueName)!;
    }

    // Retrieve raw redis client for ioredis connection
    const redisClient = this.moduleRef.get(REDIS_CLIENT, { strict: false });

    const queue = new Queue(queueName, {
      connection: redisClient,
      prefix: this.configService.get<string>('redis.keyPrefix') + 'bull',
      defaultJobOptions: this.configService.get('queue.defaultJobOptions'),
    });

    this.queues.set(queueName, queue);
    this.logger.log(
      `Registered new BullMQ queue: ${queueName}`,
      'BullMqService',
    );
    return queue;
  }

  async addJob<T = any>(
    queueName: string,
    jobName: string,
    data: T,
    opts?: JobsOptions,
  ): Promise<void> {
    const queue = this.getOrCreateQueue(queueName);
    try {
      const correlationId = RequestContextService.getCorrelationId();
      const enrichedData = correlationId ? { ...data, correlationId } : data;
      await queue.add(jobName, enrichedData, opts);
      this.logger.debug(
        `Added job ${jobName} to queue ${queueName}`,
        'BullMqService',
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to add job ${jobName} to queue ${queueName}`,
        (error as Error).stack,
        'BullMqService',
      );
      throw error;
    }
  }

  async getJobCounts(queueName: string): Promise<{
    waiting: number;
    active: number;
    failed: number;
    delayed: number;
  }> {
    const queue = this.getOrCreateQueue(queueName);
    const counts = await queue.getJobCounts(
      'waiting',
      'active',
      'failed',
      'delayed',
    );
    return {
      waiting: counts.waiting,
      active: counts.active,
      failed: counts.failed,
      delayed: counts.delayed,
    };
  }
}
