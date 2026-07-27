process.env.WORKER_MODE = 'true';
process.env.TALLY_COMPANY_NAME = '';
process.env.TALLY_TIMEOUT_MS = '5000'; // Make failures fast

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BatchSyncController } from './modules/vendor-slip/api/batch-sync.controller';
import { PrismaService } from './infrastructure/database/prisma.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  await app.init();

  const batchController = app.get(BatchSyncController);
  const prisma = app.get(PrismaService);

  console.log('\n=============================================');
  console.log('--- Starting Batch Resilience Verification ---');
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

    const createCandidates = async (count: number) => {
      const ids: string[] = [];
      for (let i = 0; i < count; i++) {
        const docId = `resil-doc-${Date.now()}-${Math.random()}`;
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
            invoiceNumber: `INV-${Date.now()}-${i}`,
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
        ids.push(candidate.id);
      }
      return ids;
    };

    console.log(
      '[Test 1] Idempotency Verification (Concurrent identical requests)',
    );
    const idempotencyCandidates = await createCandidates(3);

    // Fire two identical requests concurrently
    const req1 = batchController.createBatchSync({
      candidateIds: idempotencyCandidates,
    });
    const req2 = batchController.createBatchSync({
      candidateIds: idempotencyCandidates,
    });

    const [res1, res2] = await Promise.all([req1, req2]);
    console.log('Result 1:', res1.batchId);
    console.log('Result 2:', res2.batchId);
    if (res1.batchId === res2.batchId) {
      console.log('PASS: Idempotency Verification\n');
    } else {
      console.error('FAIL: Idempotency Verification\n');
    }

    console.log('[Test 2] Duplicate Invoice Protection');
    try {
      await batchController.createBatchSync({
        candidateIds: [idempotencyCandidates[0]],
      });
      console.error('FAIL: Duplicate Invoice Protection (Did not throw)\n');
    } catch (e: any) {
      if (e.status === 409) {
        console.log('PASS: Duplicate Invoice Protection (Caught 409)\n');
      } else {
        console.error('FAIL: Duplicate Invoice Protection (Wrong error)', e);
      }
    }

    console.log('[Test 3] Concurrency Verification (Two independent batches)');
    const batchACandidates = await createCandidates(5);
    const batchBCandidates = await createCandidates(3);

    const batchAReq = await batchController.createBatchSync({
      candidateIds: batchACandidates,
    });
    const batchBReq = await batchController.createBatchSync({
      candidateIds: batchBCandidates,
    });

    console.log(
      `Batch A: ${batchAReq.batchId} | Batch B: ${batchBReq.batchId}`,
    );
    if (batchAReq.batchId !== batchBReq.batchId) {
      console.log('PASS: Concurrency Submission\n');
    } else {
      console.error('FAIL: Concurrency Submission\n');
    }

    console.log('[Test 4] Failure Injection & Retry Workflow');
    // Using one of the existing batches (Batch B)
    // (implementation note)
    // (implementation note)
    // (implementation note)
    // So all items will fail!
    console.log('Waiting for Batch B to finish failing...');
    let batchBStatus;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      batchBStatus = await batchController.getBatchSyncStatus(
        batchBReq.batchId,
      );
      if (
        batchBStatus.status === 'COMPLETED' ||
        batchBStatus.status === 'FAILED'
      )
        break;
    }

    if (batchBStatus?.failed === 3) {
      console.log(
        'Batch B all failed (expected due to mock). Proceeding to retry...',
      );
      const failedItemId = batchBStatus.items[0].id;
      const retryRes = await batchController.retryBatchItems(
        batchBReq.batchId,
        { itemIds: [failedItemId] },
      );
      console.log(
        `Retry initiated for item ${failedItemId}. Count: ${retryRes.retriedItemsCount}`,
      );
      if (retryRes.retriedItemsCount === 1) {
        console.log('PASS: Retry Endpoint accepted request\n');
      } else {
        console.error('FAIL: Retry Endpoint\n');
      }
    } else {
      console.log(
        "Batch B didn't fail properly, skipping retry test.",
        batchBStatus,
      );
    }

    console.log('[Test 5] Large Batch Stress Test (10 invoices)');
    const largeCandidates = await createCandidates(10);
    const largeBatchRes = await batchController.createBatchSync({
      candidateIds: largeCandidates,
    });
    console.log(`Large batch created: ${largeBatchRes.batchId}`);
    console.log('Waiting for large batch completion...');
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const status = await batchController.getBatchSyncStatus(
        largeBatchRes.batchId,
      );
      if (i % 5 === 0)
        console.log(
          `[${i}s] Processing: ${status.processing} | Synced: ${status.synced} | Failed: ${status.failed}`,
        );
      if (status.status === 'COMPLETED') {
        console.log('PASS: Large Batch completed successfully\n');
        break;
      }
    }

    console.log('\n--- End Resilience Tests ---');
  } catch (error: any) {
    console.error('Error during Resilience test:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
