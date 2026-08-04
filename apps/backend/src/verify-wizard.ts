import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TransactionDraftController } from './modules/universal-transaction/controllers/transaction-draft.controller';
import { PrismaService } from './infrastructure/database/prisma.service';
import { OcrController } from './modules/vendor-slip/api/ocr.controller';

// Set feature flag for Universal Pipeline
process.env.USE_UNIVERSAL_INGESTION = 'true';
process.env.WORKER_MODE = 'true';
const { performance } = require('perf_hooks');

async function verifyWizard() {
  const initialMemory = process.memoryUsage();
  console.log(`[PERF] Initial Memory (HeapUsed): ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  const app = await NestFactory.createApplicationContext(AppModule);
  await app.init();

  const draftController = app.get(TransactionDraftController);
  const ocrController = app.get(OcrController);
  const prisma = app.get(PrismaService);

  const fileUrl = require('path').resolve('C:\\Users\\Administrator\\.gemini\\antigravity-ide\\brain\\2c91d3b5-aba8-4de8-9ed8-d8a42e25c220\\media__1785782973603.png');
  const fileId = 'prod-live-doc-wizard';

  // 1. Seed Document and Clean up previous test runs
  let document = await prisma.document.findUnique({ where: { id: fileId } });
  if (document) {
      await prisma.document.update({ where: { id: fileId }, data: { fileUrl } });
  } else {
      document = await prisma.document.create({
          data: {
              id: fileId,
              fileUrl,
              mimeType: 'image/png',
              status: 'UPLOADED',
              uploadedBy: 'system',
              source: 'API',
              checksum: 'dummy2'
          }
      });
  }
  
  console.log('--- CLEANING UP DUPLICATES ---');
  // Use raw query to delete drafts directly, avoiding TS json path errors
  await prisma.$executeRaw`DELETE FROM "TransactionDraft" WHERE payload->'header'->>'invoiceNumber' = '26886192'`;
  await prisma.$executeRaw`DELETE FROM "VoucherCandidate" WHERE "voucherNumber" = '26886192'`;
  await prisma.$executeRaw`DELETE FROM "InvoiceCandidate" WHERE "invoiceNumber" = '26886192'`;
  await prisma.$executeRaw`DELETE FROM "InvoiceFingerprint" WHERE "normalizedInvoiceNumber" = '26886192'`;

  console.log('--- SEEDING ACCOUNTING PERIOD & COMPANY ---');
  const companyId = 'UAT-TENANT-123';
  const startDate = new Date('2019-04-01');
  const endDate = new Date('2020-03-31');
  
  await prisma.company.upsert({
    where: { id: companyId },
    update: {},
    create: {
      id: companyId,
      name: 'UAT Tenant 123'
    }
  });

  await prisma.accountingPeriod.upsert({
    where: {
      companyId_startDate_endDate: {
        companyId,
        startDate,
        endDate
      }
    },
    update: { status: 'OPEN' },
    create: {
      companyId,
      name: 'FY 2019-20',
      startDate,
      endDate,
      status: 'OPEN'
    }
  });

  console.log('--- STARTING UNIVERSAL PIPELINE ---');
  const perfOCRStart = performance.now();
  await ocrController.processInvoice(fileId);
  const perfOCREnd = performance.now();
  console.log(`[PERF] OCR + AI Pipeline Duration: ${(perfOCREnd - perfOCRStart).toFixed(2)} ms`);

  // 2. Get the latest Transaction Draft
  const drafts = await prisma.$queryRaw`SELECT * FROM "TransactionDraft" ORDER BY "createdAt" DESC LIMIT 1`;
  const draft = Array.isArray(drafts) && drafts.length > 0 ? (drafts as any[])[0] : null;

  if (!draft) {
    console.error('No transaction draft found in the system!');
    await app.close();
    return;
  }

  console.log('--- TRANSACTION DRAFT ---');
  console.log(JSON.stringify(draft, null, 2));

  // 3. Call the Readiness API
  const user = { user: { id: 'test-user', organizationId: draft!.tenantId } };

  // 4. Manual Completion (Simulate Wizard)
  console.log('--- 4. SMART VOUCHER COMPLETION ---');
  let readinessReport: any;
  try {
    const perfReadyStart = performance.now();
    readinessReport = await draftController.getReadiness(draft!.id, user);
    const perfReadyEnd = performance.now();
    console.log(`[PERF] Readiness Evaluation Duration: ${(perfReadyEnd - perfReadyStart).toFixed(2)} ms`);
    console.log('--- READINESS REPORT ---');
    console.log(JSON.stringify(readinessReport, null, 2));
  } catch (error) {
    console.error('Readiness Engine Error:', error);
  }

  let finalVersion = draft.version;
  if (readinessReport && !readinessReport.isReady) {
    console.log('Draft is not ready. Simulating manual completion...');
    const payload: any = draft.payload;
    
    
    // Simulate user mapping the missing ledgers and fixing the date for Tally Educational Mode
    const finalizedPayload = {
      ...draft.payload,
      header: {
        ...draft.payload.header,
        invoiceDate: '2026-04-01',
        companyId: 'UAT-TENANT-123',
        transactionIntent: 'PURCHASE'
      },
      parties: {
        vendorId: 'Indeed India Operations Private Limited',
      },
      ledgerEntries: (draft.payload.ledgerEntries as any[]).map(entry => {
        if (entry.ledgerName.includes('GST')) {
          return { ...entry, ledgerId: 'gst-123', ledgerName: 'IGST Input' };
        } else if (entry.ledgerName === 'Total') {
          return { ...entry, ledgerId: 'party-123', ledgerName: 'Indeed India Operations Private Limited', isParty: true };
        } else {
          return { ...entry, ledgerId: 'exp-123', ledgerName: 'Advertising Expenses' };
        }
      })
    };
    
    const updatedDraft = await prisma.transactionDraft.update({
      where: { id: draft.id },
      data: { payload: finalizedPayload, version: { increment: 1 } }
    });
    finalVersion = updatedDraft.version;
    console.log('Draft completed by user.');
  }

  // 5. Approval Pipeline
  console.log('--- 5. APPROVAL PIPELINE CHECK ---');
  try {
    await draftController.approveDraft(draft.id, { currentVersion: finalVersion }, user);
    console.log('Draft approved successfully.');
  } catch(e) {
    console.error('Failed to approve draft:', e);
    await app.close();
    return;
  }

  // Wait for VoucherBuilderWorker to generate the voucher from Outbox
  console.log('--- 6. TRIGGERING VOUCHER BUILDER ---');
  
  try {
    const { getQueueToken } = require('@nestjs/bullmq');
    const queue = app.get(getQueueToken('voucher-generation'));
    await queue.add('build-draft-voucher', { draftId: draft.id });
    console.log('Manually added job to voucher-generation queue');
  } catch (e) {
    console.warn('Could not manually trigger queue:', e);
  }
  
  let candidate = null;
  let attempts = 0;
  while (attempts < 15) {
    //@ts-ignore
    candidate = await prisma.voucherCandidate.findFirst({
      //@ts-ignore
      where: { metadata: { path: ['invoiceCandidateId'], equals: draft.id } }
    });
    if (candidate) break;
    await new Promise(r => setTimeout(r, 2000));
    attempts++;
  }
  
  if (!candidate) {
    console.error('VoucherCandidate not generated!');
  } else {
    console.log('VoucherCandidate created:', candidate.id);
    console.log('Candidate Metadata:', JSON.stringify(candidate.metadata, null, 2));
    
    console.log('--- 7. LIVE ERP SYNC ---');
    console.log('ERP Status before sync:', candidate.status);
    
    // Wait for ERPSync Worker to process, including retries for missing masters
    let erpSyncJob = null;
    let syncAttempts = 0;
    while (syncAttempts < 30) {
      //@ts-ignore
      erpSyncJob = await prisma.eRPSyncJob.findFirst({ where: { voucherCandidateId: candidate.id } });
      if (erpSyncJob && (erpSyncJob.status === 'SYNCED' || erpSyncJob.status === 'FAILED_PERMANENT')) {
        break;
      }
      await new Promise(r => setTimeout(r, 2000));
      syncAttempts++;
    }

    //@ts-ignore
    const updatedCandidate = await prisma.voucherCandidate.findUnique({ where: { id: candidate.id } });
    console.log('ERP Status after sync:', updatedCandidate?.status);
    console.log('ERP Sync Job Final Status:', erpSyncJob?.status);
    console.log('ERP Sync Job Last Response:', erpSyncJob?.lastResponse);
    
    let xmlBuilderService;
    try { xmlBuilderService = app.get('VoucherXmlBuilderService'); } catch(e) {}
    try { if (!xmlBuilderService) xmlBuilderService = app.get('TallyXmlBuilderService'); } catch(e) {}
    
    if (xmlBuilderService) {
      console.log('--- 8. FINAL GENERATED XML ---');
      try {
        const payloadForXml = (updatedCandidate as any)?.payload || (updatedCandidate as any)?.metadata?.payload;
        const xml = xmlBuilderService.buildVoucherXml(payloadForXml);
        console.log(xml);
      } catch (e) {
        console.error('Could not generate XML directly', e);
      }
    }
  }

  const finalMemory = process.memoryUsage();
  console.log(`[PERF] Final Memory (HeapUsed): ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`[PERF] Memory Diff: ${((finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024).toFixed(2)} MB`);
  
  await app.close();
}

verifyWizard().catch(console.error);

