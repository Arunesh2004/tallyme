process.env.WORKER_MODE = 'true';
process.env.TALLY_COMPANY_NAME = '';
process.env.TALLY_TIMEOUT_MS = '30000';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BatchSyncController } from './modules/vendor-slip/api/batch-sync.controller';
import { PrismaService } from './infrastructure/database/prisma.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  await app.init();

  const batchController = app.get(BatchSyncController);
  const prisma = app.get(PrismaService);

  console.log('--- Starting Real Batch Sync Pipeline ---');

  try {
    // 1. Setup Company
    let company = await prisma.company.findFirst({ where: { id: 'COMP-1' } });
    if (!company) {
      company = await prisma.company.create({
        data: { id: 'COMP-1', name: '' },
      });
    } else if (company.name !== '') {
      await prisma.company.update({
        where: { id: 'COMP-1' },
        data: { name: '' },
      });
    }

    // 2. Setup Vendor
    let vendor = await prisma.vendor.findFirst({
      where: { gstin: '27AADCB2230M1Z2' },
    });
    if (!vendor) {
      vendor = await prisma.vendor.create({
        data: {
          name: 'Acme Corp',
          gstin: '27AADCB2230M1Z2',
          vendorCode: 'V-001',
        },
      });
    }

    const profile = await prisma.vendorLedgerProfile.findUnique({
      where: { vendorId: vendor.id },
    });
    if (!profile) {
      await prisma.vendorLedgerProfile.create({
        data: {
          vendorId: vendor.id,
          defaultLedgerCode: 'Cash',
        },
      });
    }

    // 3. Create Documents and InvoiceCandidates
    const candidateIds: string[] = [];
    for (let i = 1; i <= 3; i++) {
      const docId = `batch-doc-${i}-${Date.now()}`;
      await prisma.document.create({
        data: {
          id: docId,
          fileUrl: `/path/to/invoice-${i}`,
          checksum: `dummy-checksum-${i}`,
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
          subtotal: 100 * i,
          tax: 18 * i,
          total: 118 * i,
          extractedGstin: '27AADCB2230M1Z2',
          extractedName: 'Acme Corp',
          status: 'APPROVED', // MUST BE APPROVED FOR BATCH SYNC
        },
      });

      // Setup VendorMatch to satisfy VendorSlipWorker
      await prisma.vendorMatch.create({
        data: {
          documentId: docId,
          vendorId: vendor.id,
          confidence: 0.99,
        },
      });

      candidateIds.push(candidate.id);
    }

    console.log(`1. Created ${candidateIds.length} APPROVED InvoiceCandidates`);

    // 4. Start Batch Sync
    const batchResponse = await batchController.createBatchSync({
      candidateIds,
    });
    console.log('2. Batch Sync Created:', batchResponse);

    const batchId = batchResponse.batchId;

    // 5. Poll for completion
    console.log('Waiting for workers to process (up to 60s)...');
    for (let i = 0; i < 60; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const statusResponse = await batchController.getBatchSyncStatus(batchId);

      console.log(
        `[${i}s] Status: ${statusResponse.status} | Processing: ${statusResponse.processing} | Synced: ${statusResponse.synced} | Failed: ${statusResponse.failed}`,
      );

      if (statusResponse.status === 'COMPLETED') {
        console.log('3. Batch Sync Completed!');
        console.log(
          'Final Items:',
          statusResponse.items.map((item) => ({
            status: item.status,
            voucherId: item.voucherCandidateId,
            error: item.error,
          })),
        );
        break;
      }
    }

    console.log('\n--- End E2E Test ---');
  } catch (error: any) {
    console.error('Error during E2E test:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
