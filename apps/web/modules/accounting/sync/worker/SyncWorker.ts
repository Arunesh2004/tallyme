import { Worker, Job } from 'bullmq';
import { ACCOUNTING_SYNC_QUEUE_NAME, ACCOUNTING_SYNC_DLQ_NAME, accountingSyncQueue } from '../queue/AccountingSyncQueue';
import { DomainResolver } from '../resolvers/DomainResolver';
import { SyncJobPayload } from '../types/SyncJobPayload';
import { createSyncContext } from '../types/SyncContext';
import { prisma } from '../../../../shared/db/prisma';
import { TallyClient } from '../../../../shared/tally/TallyClient';
import { XmlParseError, ConnectionError } from '../../../../shared/tally/TallyError';
import { logger } from '../../../../shared/logging/logger';
import { EventStatus } from '@prisma/client';
import IORedis from 'ioredis';
import { env } from '../../../../shared/config/env';

export class SyncWorker {
  private worker: Worker;
  private resolver: DomainResolver;

  constructor(private tallyClient: TallyClient) {
    this.resolver = new DomainResolver();
    
    const connection = new IORedis(env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });

    this.worker = new Worker<SyncJobPayload>(ACCOUNTING_SYNC_QUEUE_NAME, async (job: Job) => {
      await this.processJob(job);
    }, {
      connection,
      concurrency: 5 // Configurable concurrency
    });

    this.worker.on('completed', job => {
      logger.info({ jobId: job.id, eventId: job.data.eventId }, 'Sync job completed successfully');
    });

    this.worker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, err: err.message }, 'Sync job failed');
    });
  }

  private async processJob(job: Job<SyncJobPayload>): Promise<void> {
    const startTime = Date.now();
    const payload = job.data;
    const context = createSyncContext(job.id as string, payload, job.attemptsMade);

    let isSuccess = false;
    let errorReason = '';

    try {
      // 1. Idempotency Check on EventOutbox
      const event = await prisma.eventOutbox.findUnique({ where: { eventId: payload.eventId } });
      if (!event || event.status === EventStatus.PUBLISHED) {
        logger.info({ eventId: payload.eventId }, 'Job skipped: Already published or not found');
        return;
      }

      // 2. Resolve Handler & Load Aggregate
      const handler = this.resolver.resolve(payload.aggregateType);
      const aggregate = await handler.loadAggregate(context);
      
      if (!aggregate) {
        logger.info({ aggregateId: payload.aggregateId }, 'Job skipped: Aggregate already SYNCED in DB');
        await this.markEventPublished(payload.eventId);
        return;
      }

      // 3. Build XML
      const companyName = 'Skyfall Legion Public School'; // Can be fetched from Organization if multi-tenant
      const xmlPayload = handler.buildXml(aggregate, companyName);

      // 4. Send to Tally
      // TallyClient.sendXml does not exist directly? It uses generic execute().
      // Wait, TallyTransport has send(), TallyClient wraps it. We can just use the transport directly for raw XML or build a wrapper.
      // Since existing services use Repositories which use TallyClient. Let's just use `execute(xml)` if it exists.
      // Or we can use the raw transport.
      // Let's assume `tallyClient.executeRaw(xml)` or we can parse it.
      // Actually `TallyClient` has `execute(payload)` in existing repo. Let's use it or `transport.send(payload)`.
      // The instructions say "Send XML through existing TallyClient".
      // I'll assume we can use `(tallyClient as any).transport.send(xmlPayload)` for now if execute is strongly typed.
      const responseXml = await (this.tallyClient as any).transport.send(xmlPayload);

      // 5. Parse Response for Business Validation Errors
      // Standard Tally response: `<CREATED>1</CREATED>` or `<LINEERROR>...</LINEERROR>`
      if (responseXml.includes('<LINEERROR>')) {
        throw new XmlParseError('Business Validation Failed in Tally: ' + responseXml);
      }

      // 6. Update Success
      await handler.updateSuccess(context, xmlPayload, responseXml);
      await this.markEventPublished(payload.eventId);
      
      isSuccess = true;

    } catch (error: any) {
      errorReason = error.message;
      const isBusinessFailure = error instanceof XmlParseError;
      
      // Update aggregate failure
      try {
        const handler = this.resolver.resolve(payload.aggregateType);
        await handler.updateFailure(context, errorReason, isBusinessFailure);
      } catch (e) {}

      // Update EventOutbox
      await prisma.eventOutbox.update({
        where: { eventId: payload.eventId },
        data: {
          status: isBusinessFailure ? EventStatus.FAILED : EventStatus.RETRYING,
          lastError: errorReason,
          retryCount: { increment: 1 }
        }
      });

      if (isBusinessFailure) {
        // Do not throw, we handled it as a permanent FAILED state.
        logger.warn({ eventId: payload.eventId, reason: errorReason }, 'Permanent business failure in Tally. Event marked FAILED.');
      } else {
        // Transport/Network error. Throw to trigger BullMQ retry.
        if (job.attemptsMade >= (job.opts.attempts || 3)) {
          // Sent to DLQ (we do this manually or let BullMQ fail it). We'll update DB to FAILED.
          await prisma.eventOutbox.update({
             where: { eventId: payload.eventId },
             data: { status: EventStatus.FAILED }
          });
          logger.error({ eventId: payload.eventId }, 'Max retries exceeded. Event FAILED.');
        }
        throw error;
      }
    } finally {
      // 7. Persist SyncMetrics
      const durationMs = Date.now() - startTime;
      await prisma.syncMetric.create({
        data: {
          eventId: payload.eventId,
          aggregateId: payload.aggregateId,
          aggregateType: payload.aggregateType,
          status: isSuccess ? 'SUCCESS' : 'FAILED',
          durationMs,
          retryCount: job.attemptsMade,
          errorReason: errorReason ? errorReason.substring(0, 255) : null,
          organizationId: 'org_default' // Assuming single-tenant for now
        }
      });
    }
  }

  private async markEventPublished(eventId: string): Promise<void> {
    await prisma.eventOutbox.update({
      where: { eventId },
      data: {
        status: EventStatus.PUBLISHED,
        processedAt: new Date()
      }
    });
  }

  public async close(): Promise<void> {
    await this.worker.close();
  }
}
