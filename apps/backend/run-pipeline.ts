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

  console.log('Running VendorSlipWorker for:', candidate.id);
  try {
    const res = await vendorWorker.process({ data: { candidateId: candidate.id, companyId: 'test' } } as any);
    console.log('VendorSlipWorker Result:', res);
  } catch (e:any) { console.error('Vendor Worker Error:', e.stack); return; }

  // Wait for async processing / DB writes
  await new Promise(r => setTimeout(r, 1000));

  const expAlloc = await prisma.expenseAllocationCandidate.findFirst({ where: { id: { not: '' } }, orderBy: { id: 'desc' } });
  if (!expAlloc) return console.log('No ExpenseAllocationCandidate produced.');

  const voucherCandidate = await prisma.voucherCandidate.findUnique({ where: { id: expAlloc.voucherCandidateId! } });
  if (!voucherCandidate) return console.log('No VoucherCandidate produced.');

  console.log('Running VoucherBuilderWorker for:', voucherCandidate.id);
  try {
    const res = await voucherWorker.process({ data: { expenseAllocationCandidateId: expAlloc.id }, id: 'job1' } as any);
    console.log('VoucherBuilderWorker Result:', res);
  } catch(e:any) { console.error('Voucher Worker Error:', e.stack); return; }

  console.log('Running ERPSyncWorker for:', voucherCandidate.id);
  try {
    const res = await erpWorker.process({ data: { voucherCandidateId: voucherCandidate.id }, attemptsMade: 1, id: 'job2' } as any);
    console.log('ERPSyncWorker Result:', res);
  } catch(e:any) { console.error('ERP Worker Error:', e.stack); return; }

  const syncJob = await prisma.eRPSyncJob.findFirst({ where: { voucherCandidateId: voucherCandidate.id } });
  console.log('Sync Job Status:', syncJob?.status);

  await app.close();
}
bootstrap();
