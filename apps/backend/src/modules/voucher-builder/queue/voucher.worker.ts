import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { OnModuleDestroy } from '@nestjs/common';
import { LoggerService } from '../../../core/logger/logger.service';
import { VOUCHER_BUILDER_QUEUE } from '../constants/voucher.constants';
import { ProcessVoucherBuilderUseCase } from '../use-cases/process-voucher-builder.use-case';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrometheusService } from '../../../shared/observability/metrics/prometheus.service';
import { context, propagation } from '@opentelemetry/api';
import { OpenTelemetryTracer } from '../../../shared/observability/tracing/opentelemetry.tracer';
import { AccountingPeriodService } from '../../accounting-policy/services/accounting-period.service';
import { CorrelationContext } from '../../../shared/observability/context';
import { AuditService } from '../../audit/audit.service';

@Processor(VOUCHER_BUILDER_QUEUE)
export class VoucherWorker extends WorkerHost implements OnModuleDestroy {
  constructor(
    private readonly logger: LoggerService,
    private readonly useCase: ProcessVoucherBuilderUseCase,
    private readonly prisma: PrismaService,
    private readonly prometheusService: PrometheusService,
    private readonly tracer: OpenTelemetryTracer,
    private readonly periodService: AccountingPeriodService,
    private readonly auditService: AuditService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    if (!job.data?.draftId) {
      this.logger.error('Invalid payload: missing draftId', '', 'VoucherWorker');
      throw new Error('Invalid payload: missing draftId');
    }

    // Phase 4/5: TransactionDraft Flow
    const correlationId = job.data.correlationId || 'N/A';
    
    return CorrelationContext.run({ correlationId }, async () => {
      this.logger.log(
        `Processing voucher builder job ${job.id} for draft ${job.data.draftId}`,
        'VoucherWorker',
      );

      const extractedContext = propagation.extract(context.active(), job.data);
      
      return context.with(extractedContext, async () => {
        return this.tracer.startActiveSpan('VoucherWorker.process', async (span) => {
          const timer = this.prometheusService.voucherBuildSeconds.startTimer();
          try {
          const draft = await this.prisma.transactionDraft.findUnique({
            where: { id: job.data.draftId },
          });
          
          if (!draft) throw new Error(`Draft ${job.data.draftId} not found`);

          const rawPayload = draft.payload as any;
          const canonical = rawPayload.metadata?.completionDraft || rawPayload; // CanonicalAccountingModel (Consume Completion Draft if available)

          // Period validation
          const targetDate = new Date(canonical.header.invoiceDate || canonical.header.dueDate || Date.now());
          const companyId = canonical.header.companyId || canonical.header.tenantId;
          await this.periodService.validatePostingAllowed(companyId, targetDate);

        const isPurchase = canonical.header.type === 'EXPENSE' || canonical.header.type === 'BILL';
        
        const creditLines = [];
        const debitLines = [];
        let totalAmount = 0;
        let vendorLedger = '';

        for (const entry of canonical.ledgerEntries) {
          if (entry.isDebit) {
            debitLines.push({
              ledger: entry.ledgerName,
              amount: entry.amount,
              hsnSac: entry.dimensions?.hsnSac,
              rate: entry.dimensions?.rate,
              quantity: entry.dimensions?.quantity,
              unit: entry.dimensions?.unit,
            });
          } else {
            creditLines.push({
              ledger: entry.ledgerName,
              amount: entry.amount,
              isVendor: entry.isParty,
            });
            if (entry.isParty) {
              vendorLedger = entry.ledgerName;
            }
            totalAmount += entry.amount;
          }
        }

        const adaptedPayload: any = {
          voucherType: canonical.header.transactionIntent || (isPurchase ? 'PURCHASE' : 'RECEIPT'),
          candidateId: draft.id,
          companyId: canonical.header.companyId || canonical.header.tenantId,
          invoice: {
            number: canonical.header.invoiceNumber,
            date: canonical.header.invoiceDate || canonical.header.transactionDate,
            total: totalAmount,
            tax: debitLines.find((l: any) => l.ledger.toUpperCase().includes('GST'))?.amount || 0,
          },
          allocation: {
            vendorLedger,
            totalAmount,
            lines: debitLines,
            creditLines: creditLines,
          },
          metadata: {
            ...canonical.metadata,
            draftId: draft.id,
          },
        };

        if (!isPurchase) {
          adaptedPayload.student = {
            id: canonical.parties?.studentId,
          };
          adaptedPayload.paymentData = {
            amount: totalAmount,
            transactionId: canonical.metadata?.paymentCandidateId || '',
            gateway: canonical.metadata?.gateway || '',
          };
        }

          await this.useCase.execute(adaptedPayload);

          await this.auditService.log({
            action: 'VOUCHER_CANDIDATE_CREATED',
            entity: 'TransactionDraft',
            entityId: job.data.draftId,
            correlationId,
            reason: 'Voucher candidate generated from draft',
          });

          return { success: true };
        } catch (error: any) {
          this.logger.error(
            `Failed to process voucher for draft ${job.data.draftId}`,
            error.stack,
            'VoucherWorker',
          );
          throw error;
        } finally {
          timer();
          span.end();
        }
      });
    });
    });
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down VoucherWorker', 'VoucherWorker');
    try {
      await this.worker.close();
    } catch (e: any) {
      // Ignore exception if worker was not initialized during tests
    }
  }
}
