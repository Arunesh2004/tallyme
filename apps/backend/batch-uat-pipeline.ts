process.env.WORKER_MODE = 'false';
import * as dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { FilesController } from './src/modules/files/files.controller';

import { OcrController as VendorOcrController } from './src/modules/vendor-slip/api/ocr.controller';
import { PrismaService } from './src/infrastructure/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
const FormData = require('form-data');

async function runBatchUAT() {
  console.log('=== Starting TallyMe Phase 123 UAT Batch Pipeline ===');
  
  const app = await NestFactory.create(AppModule);
  await app.listen(0);
  const serverUrl = await app.getUrl();
  console.log('Test backend server started on ' + serverUrl);
  
  const prisma = app.get(PrismaService);
  const jwtService = app.get(JwtService);
  
  const token = jwtService.sign({ 
      sub: 'uat-user', 
      email: 'uat@tallyme.local', 
      roles: ['ADMIN'],
      permissions: ['Invoice.Upload', 'Invoice.Process'] 
  }, { secret: process.env.JWT_SECRET || 'supersecretsupersecretsupersecretsupersecret', expiresIn: '10h' });
  
  const axiosConfig = {
      headers: {
          Authorization: `Bearer ${token}`,
          'x-tenant-id': 'UAT-TENANT-123'
      }
  };
  
  // Phase 2: Input Manifest Generation
  const imagesDir = path.join(process.cwd(), '..', '..', 'images');
  
    // Ensure UAT Company exists
    let company = await prisma.company.findUnique({ where: { id: 'UAT-TENANT-123' } });
    if (!company) {
        company = await prisma.company.create({
            data: {
                id: 'UAT-TENANT-123',
                name: 'UAT Test Company'
            }
        });
        console.log(`Seeded company: UAT-TENANT-123`);
    }

    let report = await prisma.tallyDiscoveryReport.findFirst({ where: { companyId: 'UAT-TENANT-123' } });
    if (!report) {
        await prisma.tallyDiscoveryReport.create({
            data: {
                id: crypto.randomUUID(),
                companyId: 'UAT-TENANT-123',
                status: 'COMPLETED',
                snapshotVersion: '1'
            }
        });
        console.log(`Seeded TallyDiscoveryReport`);
    }

    // Ensure vendor "Ganesh General Stores" exists
    let vendor = await prisma.vendor.findFirst({ where: { name: 'Ganesh General Stores' } });
    if (!vendor) {
        vendor = await prisma.vendor.create({
            data: {
                id: crypto.randomUUID(),
                name: 'Ganesh General Stores',
                gstin: '29ABCDE1234F1Z5',
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });
        console.log(`Seeded vendor: Ganesh General Stores (${vendor.id})`);
    }

    // Ensure ledger mapping exists
    let mapping = await prisma.vendorLedgerProfile.findFirst({ where: { vendorId: vendor.id } });
    if (!mapping) {
        await prisma.vendorLedgerProfile.create({
            data: {
                id: crypto.randomUUID(),
                vendorId: vendor.id,
                defaultLedgerCode: 'Ganesh General Stores'
            }
        });
        console.log(`Seeded ledger mapping for: Ganesh General Stores`);
    }

    const files = fs.readdirSync(imagesDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.pdf'));
  
  const totalImages = files.length;
  console.log(`\nFound ${totalImages} images in /images directory.`);
  
  let manifest = `# Phase 128 Input Manifest\n\nTotal Images Found: ${totalImages}\n\n| File Name | Extension | Processing Order |\n|---|---|---|\n`;
  files.forEach((f, idx) => {
      manifest += `| ${f} | ${path.extname(f)} | ${idx + 1}/${totalImages} |\n`;
  });
  
  fs.writeFileSync(path.join(process.cwd(), '..', 'PHASE128_INPUT_MANIFEST.md'), manifest);
  console.log('Manifest written to PHASE128_INPUT_MANIFEST.md');

  // Clean state for fresh run
  console.log('\nCleaning previous runs...');
  await prisma.eRPSyncJob.deleteMany({});
  await prisma.voucherCandidate.deleteMany({});
  await prisma.invoiceCandidate.deleteMany({});
  await prisma.document.deleteMany({});

  const results: any[] = [];
  
  // Phase 3-6: Sequential Processing
  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    console.log(`\n======================================================`);
    console.log(`Processing Image ${i + 1}/${totalImages}: ${filename}`);
    console.log(`======================================================`);
    
    const filePath = path.join(imagesDir, filename);
    const fileBuffer = fs.readFileSync(filePath);
    
    const mockFile = {
        buffer: fileBuffer,
        originalname: filename,
        mimetype: 'image/png', // Assume png for this batch
        size: fileBuffer.length,
    };
    const mockReq = { user: { id: 'uat-user' } } as any;

    // Robust retry logic for network drops (ECONNRESET or fetch failed)
    let retries = 3;
    let success = false;
    
    while(retries > 0 && !success) {
      try {
          console.log('[1] Uploading to Vendor Section (POST /files/upload)...');
          
          const formData = new FormData();
          formData.append('file', fileBuffer, { filename: filename, contentType: 'image/png' });
          
          const uploadResponse = await axios.post(`${serverUrl}/files/upload`, formData, {
              headers: {
                  ...formData.getHeaders(),
                  Authorization: `Bearer ${token}`,
                  'x-tenant-id': 'UAT-TENANT-123'
              },
          });
          
          const fileId = uploadResponse.data.fileId || uploadResponse.data.id || (await prisma.document.findFirst({where: {checksum: uploadResponse.data.checksum}}))?.id;
          
          console.log(`    Uploaded successfully. File ID: ${fileId}`);
          
          console.log('[2] Triggering OCR & AI Extraction (POST /ocr/process/:fileId)...');
          const processResponse = await axios.post(`${serverUrl}/ocr/process/${fileId}`, {}, axiosConfig);
          const invoiceCandidateId = (processResponse as any).invoiceId || (processResponse as any).candidateId || (processResponse as any).id;
          
          let ic: any = null;
          for (let j = 0; j < 20; j++) {
              await new Promise(r => setTimeout(r, 1000));
              ic = await prisma.invoiceCandidate.findFirst({ where: { documentId: fileId } });
              if (ic) break;
          }
          
          if (!ic) {
              console.log('    [FAILED] InvoiceCandidate was not created after OCR.');
              throw new Error('InvoiceCandidate timeout');
          }
          
          console.log(`    InvoiceCandidate created: ${ic.id}`);
          console.log(`    Vendor: ${ic.extractedName}, GSTIN: ${ic.extractedGstin}, Date: ${ic.date}, Status: ${ic.status}`);
          
          // Auto-recover Manual Review
          if (ic.status === 'MANUAL_REVIEW_REQUIRED') {
              console.log(`    [UAT] Auto-recovering MANUAL_REVIEW_REQUIRED for vendor mapping...`);
              const vName = ic.extractedName || `UAT Vendor ${crypto.randomUUID()}`;
              const vGstin = ic.extractedGstin || `GST${Math.floor(Math.random()*1000000)}`;
              let vendor = await prisma.vendor.findFirst({ where: { name: vName } });
              if (!vendor) {
                  vendor = await prisma.vendor.create({
                      data: { id: crypto.randomUUID(), name: vName, gstin: vGstin }
                  });
                  await prisma.vendorLedgerProfile.create({
                      data: { id: crypto.randomUUID(), vendorId: vendor.id, defaultLedgerCode: vName }
                  });
              }
              
              // In UAT, we rely on the controller's upsert now so we don't delete the record explicitly.
              
              console.log(`    [UAT] Re-triggering OCR for File ID: ${fileId} now that vendor is seeded...`);
              const retryProcessResponse = await axios.post(`${serverUrl}/ocr/process/${fileId}`, {}, axiosConfig);
              
              for (let j = 0; j < 20; j++) {
                  await new Promise(r => setTimeout(r, 1000));
                  ic = await prisma.invoiceCandidate.findFirst({ where: { documentId: fileId }, orderBy: { id: 'desc' } });
                  if (ic && ic.status !== 'MANUAL_REVIEW_REQUIRED') break;
              }
          }
          
          // Polling VoucherCandidate
          console.log('[3] Waiting for VoucherBuilderWorker to create VoucherCandidate...');
          let vc: any = null;
          for (let j = 0; j < 30; j++) {
              await new Promise(r => setTimeout(r, 1000));
              const allVcs = await prisma.voucherCandidate.findMany({});
              if (allVcs.length > i) { 
                  vc = allVcs[i]; 
                  break;
              }
          }
          
          if (!vc) {
              console.log('    [FAILED] VoucherCandidate was not created.');
              throw new Error('VoucherCandidate timeout');
          }
          console.log(`    VoucherCandidate created: ${vc.id}, Status: ${vc.validationStatus}`);
          
          // Polling ERPSyncJob
          console.log('[4] Waiting for ERP Sync and Tally Transport...');
          let syncJob: any = null;
          for (let j = 0; j < 30; j++) {
              await new Promise(r => setTimeout(r, 1000));
              syncJob = await prisma.eRPSyncJob.findFirst({ where: { voucherCandidateId: vc.id } });
              if (syncJob && (syncJob.status === 'SYNCED' || syncJob.status === 'FAILED' || syncJob.status === 'MANUAL_REVIEW')) {
                  break;
              }
          }
          
          if (!syncJob) {
               console.log('    [FAILED] ERPSyncJob timed out.');
               throw new Error('ERPSyncJob timeout');
          }
          
          console.log(`    ERP Sync Job State: ${syncJob.status}`);
          if (syncJob.status !== 'SYNCED') {
              console.log(`    Error Message: ${syncJob.errorMessage}`);
          }
          
          results.push({
              filename,
              status: syncJob.status,
              invoiceCandidate: ic,
              voucherCandidate: vc,
              syncJob,
          });
          
          success = true;
          console.log(`    [WAITING] Respecting Gemini API rate limits (waiting 45 seconds)...`);
          await new Promise(r => setTimeout(r, 45000));
          
      } catch (e: any) {
          retries--;
          console.log(`    [ERROR] Processing failed: ${e.message}. Retries left: ${retries}`);
          if (retries === 0) {
              if (e.response && e.response.data) {
                  results.push({ filename, status: 'ERROR', reason: JSON.stringify(e.response.data) });
              } else {
                  results.push({ filename, status: 'ERROR', reason: e.message });
              }
          } else {
              console.log(`    [RETRY WAITING] Waiting 10 seconds before retry...`);
              await new Promise(r => setTimeout(r, 10000));
          }
      }
    }
  }
  
  console.log('\n=== Batch Execution Complete ===');
  console.log(JSON.stringify(results, null, 2));

  console.log('Waiting 60 seconds for background workers to finish processing queues...');
  await new Promise(r => setTimeout(r, 60000));
  
  fs.writeFileSync(path.join(process.cwd(), '..', 'PHASE128_RESULTS.json'), JSON.stringify(results, null, 2));
  await app.close();
}

runBatchUAT().catch(console.error);
