import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { VendorSlipWorker } from './src/modules/vendor-slip/queue/vendor-slip.worker';
import { VoucherWorker } from './src/modules/voucher-builder/queue/voucher.worker';
import { ERPSyncWorker } from './src/modules/erp-connector/queue/erp-sync.worker';
import { VendorSlipModule } from './src/modules/vendor-slip/vendor-slip.module';
import { VoucherBuilderModule } from './src/modules/voucher-builder/voucher-builder.module';
import { ERPConnectorModule } from './src/modules/erp-connector/erp-connector.module';
import { PrismaService } from './src/infrastructure/database/prisma.service';

async function bootstrap() {
  process.env.WORKER_MODE = 'true';
  const app = await NestFactory.createApplicationContext(AppModule);
  const vendorWorker = app.get(VendorSlipWorker);
  const voucherWorker = app.get(VoucherWorker);
  const erpWorker = app.get(ERPSyncWorker);
  const prisma = app.get(PrismaService);

  const candidate = await prisma.invoiceCandidate.findFirst({ where: { status: 'EXTRACTED' }, orderBy: { id: 'desc' } });
  if (!candidate) return console.log('No EXTRACTED candidate');

  console.log('Dispatching to VendorSlipWorker via Queue:', candidate.id);
  const queueService = app.get('QUEUE_PROVIDER');
  await queueService.addJob('vendor-slip-queue', 'process-vendor-slip', { candidateId: candidate.id, companyId: 'test-company-123' });

  // Poll for completion
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const syncJob = await prisma.eRPSyncJob.findFirst({ orderBy: { createdAt: 'desc' } });
    if (syncJob) {
      console.log('Found Sync Job:', syncJob.id, 'Status:', syncJob.status, 'Error:', syncJob.lastError);
      if ((syncJob.status as string) === 'COMPLETED' || (syncJob.status as string) === 'FAILED' || (syncJob.status as string) === 'MANUAL_REVIEW') {
         break;
      }
    } else {
      console.log('Waiting for pipeline...');
    }
  }

  await app.close();
}
bootstrap();
