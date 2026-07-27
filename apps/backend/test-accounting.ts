import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PrismaClient } from '@prisma/client';
import { CompanyContextService } from './src/core/context/company-context.service';
import { QueueEvents } from 'bullmq';
import { TallyDiscoveryService } from './src/modules/accounting-intelligence/tally-discovery/tally-discovery.service';

process.env.WORKER_MODE = 'true';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = new PrismaClient();
  const queueService = app.get('QUEUE_PROVIDER');
  const companyContext = app.get(CompanyContextService, { strict: false });
  companyContext.getCompanyId = () => 'test-company-123';
  const tallyDiscoveryService = app.get(TallyDiscoveryService);

  const company = await prisma.company.upsert({ where: { id: 'test-company-123' }, update: {}, create: { id: 'test-company-123', name: '' } });
  const vendor = await prisma.vendor.upsert({ where: { gstin: '27ABCDE1234F1Z5' }, update: {}, create: { companyId: company.id, name: 'TEST VENDOR', gstin: '27ABCDE1234F1Z5' } });
  await prisma.vendorLedgerProfile.upsert({ where: { vendorId: vendor.id }, update: {}, create: { vendorId: vendor.id, defaultLedgerCode: 'TEST_VENDOR_LEDGER' } });
  
  await prisma.ledgerMappingConfiguration.deleteMany({});
  await prisma.ledgerMappingConfiguration.create({ data: { vendorLedger: 'TEST_VENDOR_EXPENSE', gstLedger: 'INPUT_GST_LEDGER', studentLedger: 'TEST_STUDENT_INCOME' } });

  const report = await prisma.tallyDiscoveryReport.create({ data: { companyId: company.id, snapshotVersion: '1.0', status: 'COMPLETED' } });
  await prisma.discoveryLedger.createMany({ 
    data: [
      { tallyDiscoveryReportId: report.id, data: { name: 'TEST_VENDOR_LEDGER', type: 'LEDGER' } }, 
      { tallyDiscoveryReportId: report.id, data: { name: 'TEST_VENDOR_EXPENSE', type: 'LEDGER' } }, 
      { tallyDiscoveryReportId: report.id, data: { name: 'INPUT_GST_LEDGER', type: 'LEDGER' } }
    ] 
  });

  console.log('Running Tally Discovery to populate company cache...');
  await tallyDiscoveryService.runDiscovery(company.id, 'test-user');

  const doc = await prisma.document.create({ data: { fileUrl: '/dev/null', checksum: 'TEST-' + Date.now(), mimeType: 'application/pdf', uploadedBy: 'test', source: 'MANUAL', status: 'UPLOADED' } });
  
  const candidate = await prisma.invoiceCandidate.create({
    data: {
      documentId: doc.id,
      invoiceNumber: 'INV-001',
      date: new Date(),
      total: 118,
      tax: 18,
      subtotal: 100,
      extractedGstin: '27ABCDE1234F1Z5',
      extractedName: 'TEST VENDOR',
      status: 'EXTRACTED',
      extractedData: { confidence: 0.99 }
    }
  });

  console.log('Created Candidate:', candidate.id);

  const queueEvents = new QueueEvents('vendor-slip-queue', { connection: { host: 'localhost', port: 6380 } });
  await queueService.addJob('vendor-slip-queue', 'process-slip', { candidateId: candidate.id, companyId: company.id });
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const updated = await prisma.invoiceCandidate.findUnique({ where: { id: candidate.id } });
  console.log('Candidate Status:', updated?.status);
  
  await queueEvents.close();
  await app.close();
  await prisma.$disconnect();
}
bootstrap().catch(console.error);
