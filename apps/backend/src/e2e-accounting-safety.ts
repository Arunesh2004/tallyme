process.env.WORKER_MODE = 'true';
process.env.TALLY_COMPANY_NAME = '';
process.env.TALLY_TIMEOUT_MS = '5000'; // Make failures fast

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BatchSyncController } from './modules/vendor-slip/api/batch-sync.controller';
import { PrismaService } from './infrastructure/database/prisma.service';
import { IQueueService } from './infrastructure/queue/queue.interfaces';
import { QUEUE_PROVIDER } from './infrastructure/queue/queue.constants';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  await app.init();

  const batchController = app.get(BatchSyncController);
  const prisma = app.get(PrismaService);
  const queue = app.get<IQueueService>(QUEUE_PROVIDER);

  console.log('\n=============================================');
  console.log('--- Starting Accounting Safety Verification ---');
  console.log('=============================================\n');

  try {
    // 1. Setup Data
    await prisma.company.upsert({
      where: { id: 'COMP-1' },
      update: {},
      create: { id: 'COMP-1', name: '' },
    });
    const vendor = await prisma.vendor.upsert({
      where: { gstin: '27AADCB2230M1Z2' },
      update: {},
      create: {
        name: 'Acme Corp',
        gstin: '27AADCB2230M1Z2',
        vendorCode: 'V-001',
      },
    });
    await prisma.vendorLedgerProfile.upsert({
      where: { vendorId: vendor.id },
      update: {},
      create: { vendorId: vendor.id, defaultLedgerCode: 'Cash' },
    });

    const createCandidate = async (invoiceNumber: string) => {
      const docId = `safe-doc-${invoiceNumber}`;
      await prisma.document.create({
        data: {
          id: docId,
          fileUrl: `/path/to/invoice`,
          checksum: `chk-${docId}`,
          mimeType: 'application/pdf',
          uploadedBy: 'system',
          source: 'UPLOAD',
          status: 'UPLOADED',
        },
      });
      const candidate = await prisma.invoiceCandidate.create({
        data: {
          documentId: docId,
          invoiceNumber,
          date: new Date(),
          subtotal: 100,
          tax: 18,
          total: 118,
          extractedGstin: '27AADCB2230M1Z2',
          extractedName: 'Acme Corp',
          status: 'APPROVED',
        },
      });
      await prisma.vendorMatch.create({
        data: { documentId: docId, vendorId: vendor.id, confidence: 0.99 },
      });
      return candidate.id;
    };

    console.log('[Test 1] Duplicate Voucher Protection & Idempotency');
    const invoice1 = await createCandidate(`INV-SAFE-1-${Date.now()}`);

    // Process it twice directly via Vendor Worker
    await queue.addJob('vendor-slip-queue', 'process-vendor-slip', {
      candidateId: invoice1,
      companyId: 'COMP-1',
    });
    await queue.addJob('vendor-slip-queue', 'process-vendor-slip', {
      candidateId: invoice1,
      companyId: 'COMP-1',
    });

    // Wait for them to finish
    await new Promise((r) => setTimeout(r, 6000));

    const vouchers = await prisma.voucherCandidate.findMany({
      where: {
        entries: {
          some: {
            voucherCandidate: {
              // Just trying to see all vouchers created in the last 10 seconds for this run
              date: { gt: new Date(Date.now() - 15000) },
            },
          },
        },
      },
      orderBy: { id: 'desc' },
    });

    // We expect only ONE voucher for that exact candidate, but VoucherCandidate doesn't link directly to InvoiceCandidate.
    // (implementation note)
    // Ah! Our idempotency depends on batchSyncItemId. Since we just passed candidateId directly to vendor-slip-queue, it won't have batchSyncItemId!
    // So for this test, we must use Batch Sync flow.
    console.log(
      'Skipping raw queue duplicate check, testing via Batch Sync instead...',
    );

    console.log('[Test 2] Retry Accounting Safety (No Duplicate Vouchers)');
    const invoice2 = await createCandidate(`INV-SAFE-2-${Date.now()}`);
    const batchRes = await batchController.createBatchSync({
      candidateIds: [invoice2],
    });

    console.log('Waiting for initial batch to fail (ERP Failure)...');
    let batchStatus: any;
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      batchStatus = await batchController.getBatchSyncStatus(batchRes.batchId);
      if (batchStatus.status === 'COMPLETED' || batchStatus.status === 'FAILED')
        break;
    }

    const initialVoucherId = batchStatus?.items[0]?.voucherCandidateId;
    console.log(`Initial VoucherCandidate created: ${initialVoucherId}`);

    console.log('Initiating Retry...');
    await batchController.retryBatchItems(batchRes.batchId, {
      itemIds: [batchStatus?.items[0]?.id],
    });

    console.log('Waiting for retry to finish...');
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      batchStatus = await batchController.getBatchSyncStatus(batchRes.batchId);
      if (batchStatus.status === 'COMPLETED' || batchStatus.status === 'FAILED')
        break;
    }

    const finalVoucherId = batchStatus?.items[0]?.voucherCandidateId;
    console.log(`Final VoucherCandidate after retry: ${finalVoucherId}`);

    if (
      initialVoucherId &&
      finalVoucherId &&
      initialVoucherId === finalVoucherId
    ) {
      console.log('PASS: No Duplicate VoucherCandidate created during Retry\n');
    } else {
      console.error('FAIL: Duplicate VoucherCandidate created!\n');
    }

    // Check ERPSyncJobs count
    if (finalVoucherId) {
      const erpJobs = await prisma.eRPSyncJob.findMany({
        where: { voucherCandidateId: finalVoucherId },
      });
      console.log(`Found ${erpJobs.length} ERPSyncJob for this voucher.`);
      if (erpJobs.length === 1) {
        console.log('PASS: No Duplicate ERPSyncJob created during Retry\n');
      } else {
        console.error('FAIL: Duplicate ERPSyncJob created!\n');
      }
    }

    console.log('[Test 3] ERP Reconciliation Audit');
    const allSyncedItems = await prisma.batchSyncItem.findMany({
      where: { status: 'SYNCED' },
    });
    let auditPassed = true;
    for (const item of allSyncedItems) {
      if (!item.voucherCandidateId) {
        auditPassed = false;
        continue;
      }
      const erpJob = await prisma.eRPSyncJob.findUnique({
        where: { voucherCandidateId: item.voucherCandidateId },
      });
      if (!erpJob || erpJob.status !== 'SYNCED') auditPassed = false;
    }
    if (auditPassed) {
      console.log(
        'PASS: ERP Reconciliation Audit (All SYNCED items have valid Vouchers and ERP Jobs)\n',
      );
    } else {
      console.error('FAIL: ERP Reconciliation Audit\n');
    }

    console.log('\n--- End Safety Tests ---');
  } catch (error: any) {
    console.error('Error during Safety test:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
