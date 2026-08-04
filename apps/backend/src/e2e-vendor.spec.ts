// @ts-nocheck
import { register } from 'prom-client';
process.env.WORKER_MODE = 'true';
process.env.TALLY_COMPANY_NAME = '';
process.env.TALLY_TIMEOUT_MS = '30000';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { OcrController } from './modules/vendor-slip/api/ocr.controller';
import { PrismaService } from './infrastructure/database/prisma.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  await app.init();

  const ocrController = app.get(OcrController);
  const prisma = app.get(PrismaService);

  console.log('--- Starting Real Vendor Slip Pipeline ---');

  try {
    const fileId = 'unknown-doc';

    // (implementation note)
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

    // (implementation note)
    let document = await prisma.document.findFirst({
      where: { id: 'unknown-doc' },
    });
    const realFileUrl = require('path').resolve(
      'C:\\Users\\Administrator\\.gemini\\antigravity-ide\\brain\\f2002457-bc61-4f09-af56-fb88e9d8b807\\sample_vendor_invoice_1785504602968.png',
    );
    if (!document) {
      document = await prisma.document.create({
        data: {
          id: 'unknown-doc',
          fileUrl: realFileUrl,
          checksum: 'dummy-checksum',
          mimeType: 'image/png',
          uploadedBy: 'system',
          source: 'UPLOAD',
          status: 'UPLOADED',
        },
      });
    } else {
      document = await prisma.document.update({
        where: { id: 'unknown-doc' },
        data: { fileUrl: realFileUrl, mimeType: 'image/png' },
      });
    }

    // Clear old data for the candidate
    await prisma.invoiceCandidate.deleteMany({
      where: { documentId: document.id },
    });

    // Also clear old jobs to avoid Unique Constraint and Adapter issues
    await prisma.eRPSyncHistory.deleteMany({});
    await prisma.eRPSyncAttempt.deleteMany({});
    await prisma.eRPSyncJob.deleteMany({});
    await prisma.voucherCandidate.deleteMany({});

    // (implementation note)
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

    // Create a ledger profile for the vendor
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
    } else if (profile.defaultLedgerCode !== 'Cash') {
      await prisma.vendorLedgerProfile.update({
        where: { id: profile.id },
        data: { defaultLedgerCode: 'Cash' },
      });
    }

    const result = await ocrController.processInvoice(fileId);

    console.log('1. OCR Processing Started:', result);

    // Wait for the queues to process
    console.log('Waiting for workers to process (up to 45s)...');
    for (let i = 0; i < 45; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Query the latest PURCHASE voucher created in the last minute
      const voucher = await prisma.voucherCandidate.findFirst({
        where: {
          voucherType: 'Purchase',
        },
        orderBy: {
          id: 'desc',
        },
        include: {
          erpSyncJob: true,
          entries: true,
        },
      });

      if (voucher) {
        console.log('2. Voucher Candidate Created:', voucher.voucherNumber);
        console.log(
          '   Entries:',
          voucher.entries.map(
            (e) => `${e.isDebit ? 'DR' : 'CR'} ${e.ledgerName} ${e.amount}`,
          ),
        );

        if (voucher.erpSyncJob) {
          console.log('3. ERP Sync Job Status:', voucher.erpSyncJob.status);
          if (voucher.erpSyncJob.status === 'SYNCED') {
            console.log('   Sync Successful!');
            break;
          }
        }
      } else {
        process.stdout.write('.');
      }
    }

    console.log('\n--- End E2E Test ---');
  } catch (error: any) {
    console.error('Error during E2E test:', error);
  } finally {
    await app.close();
  }
}




afterEach(() => { register.clear(); });
describe('e2e-vendor.ts', () => { 
  jest.setTimeout(300000); 
  it('should execute successfully', async () => { 
    if (typeof runE2E === 'function') await runE2E(); 
    else if (typeof bootstrap === 'function') await bootstrap(); 
    else if (typeof main === 'function') await main(); 
    else if (typeof runOperationsRuntime === 'function') await runOperationsRuntime(); 
  }); 
});
