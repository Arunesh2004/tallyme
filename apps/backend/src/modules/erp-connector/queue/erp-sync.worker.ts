import { Processor, WorkerHost } from '@nestjs/bullmq';
import { OnModuleDestroy } from '@nestjs/common';
import { Job } from 'bullmq';
import { LoggerService } from '../../../core/logger/logger.service';
import { ERP_SYNC_QUEUE } from '../constants/erp.constants';
import { ProcessERPSyncUseCase } from '../use-cases/process-erp-sync.use-case';
import { PrometheusService } from '../../../shared/observability/metrics/prometheus.service';
import { context, propagation } from '@opentelemetry/api';
import { OpenTelemetryTracer } from '../../../shared/observability/tracing/opentelemetry.tracer';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AccountingPeriodService } from '../../accounting-policy/services/accounting-period.service';
import { CorrelationContext } from '../../../shared/observability/context';

@Processor(ERP_SYNC_QUEUE)
export class ERPSyncWorker extends WorkerHost implements OnModuleDestroy {
  constructor(
    private readonly logger: LoggerService,
    private readonly useCase: ProcessERPSyncUseCase,
    private readonly prometheusService: PrometheusService,
    private readonly tracer: OpenTelemetryTracer,
    private readonly prisma: PrismaService,
    private readonly periodService: AccountingPeriodService,
  ) {
    super();
  }

  async onModuleDestroy() {
    this.logger.log({ message: 'Shutting down ERPSyncWorker' }, 'ERPSyncWorker');
    try {
      if (this.worker) {
        await this.worker.close();
      }
    } catch (e) {
      // Ignore if worker hasn't been initialized during tests
    }
  }

  async process(job: Job<any, any, string>): Promise<any> {
    let syncJobId = job.data.jobId;

    if (!syncJobId && job.data.voucherCandidateId) {
      const newJob = await this.useCase.createJob(job.data.voucherCandidateId);
      syncJobId = newJob.id;
    }

    const correlationId = job.data.correlationId || 'N/A';

    return CorrelationContext.run({ correlationId }, async () => {
      this.logger.log(
        {
          message: 'Processing ERP sync job',
          jobId: syncJobId,
          attempt: job.attemptsMade,
        },
        'ERPSyncWorker',
      );

      const extractedContext = propagation.extract(context.active(), job.data);

      return context.with(extractedContext, async () => {
        // Period validation
        const erpJob = await this.prisma.eRPSyncJob.findUnique({
          where: { id: syncJobId },
          include: { voucherCandidate: true },
        });

        if (erpJob?.voucherCandidate) {
          await this.periodService.validatePostingAllowed(
            erpJob.voucherCandidate.companyId!,
            erpJob.voucherCandidate.date
          );
        }

        return this.tracer.startActiveSpan('ERPSyncWorker.process', async (span) => {
          const timer = this.prometheusService.erpSyncSeconds.startTimer();
          try {
            await this.useCase.execute(syncJobId, job.attemptsMade || 1);
            return { success: true };
          } catch (error: any) {
            this.logger.error(
              {
                message: 'ERP Sync job threw error, delegating to BullMQ retry',
                jobId: job.data.jobId,
              },
              (error as Error).stack,
              'ERPSyncWorker',
            );
            throw error; // Triggers BullMQ retry
          } finally {
            timer();
            span.end();
          }
        });
      });
    });
  }
}
