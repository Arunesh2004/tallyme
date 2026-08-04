import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { OcrController } from './modules/vendor-slip/api/ocr.controller';
import { PrismaService } from './infrastructure/database/prisma.service';

process.env.WORKER_MODE = 'true';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  await app.init();

  const ocrController = app.get(OcrController);
  const prisma = app.get(PrismaService);

  console.log('--- RUNTIME VERIFICATION ---');
  console.log('Backend Context: RUNNING');
  console.log('Prisma Connection:', await prisma.$queryRaw`SELECT 1`);

  const fileUrl = require('path').resolve('C:\\Users\\Administrator\\.gemini\\antigravity-ide\\brain\\2c91d3b5-aba8-4de8-9ed8-d8a42e25c220\\media__1785782973603.png');
  const fileId = 'prod-live-doc';

  // Seed document
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
              checksum: 'dummy'
          }
      });
  }

  // Clear previous runs
  try {
    await prisma.$executeRaw`DELETE FROM "TransactionDraft" WHERE "documentId" = ${fileId}`;
  } catch (e) {}
  try {
    await prisma.$executeRaw`DELETE FROM "TransactionDraft" WHERE "sourceDocumentId" = ${fileId}`;
  } catch (e) {}
  try {
    await prisma.invoiceCandidate.deleteMany({ where: { documentId: fileId }});
  } catch (e) {}
  
  console.log('--- STARTING PIPELINE ---');
  const result = await ocrController.processInvoice(fileId);
  console.log('OCR Controller Result:', result);

  console.log('Waiting for workers (20s)...');
  await new Promise(r => setTimeout(r, 20000));

  const doc = await prisma.document.findUnique({ where: { id: fileId }});
  console.log('Document Status:', doc?.status);

  let draft: any;
  try {
    const drafts = await prisma.$queryRaw`SELECT * FROM "TransactionDraft" ORDER BY "createdAt" DESC LIMIT 1`;
    draft = Array.isArray(drafts) ? drafts[0] : null;
  } catch(e) {
    console.error('Draft fetch error:', e);
  }
  console.log('Transaction Draft:', JSON.stringify(draft, null, 2));

  const candidate = await prisma.invoiceCandidate.findUnique({ where: { documentId: fileId }});
  console.log('Invoice Candidate:', JSON.stringify(candidate, null, 2));

  if (candidate) {
    let voucher: any;
    try {
      const vouchers = await prisma.$queryRaw`SELECT * FROM "VoucherCandidate" ORDER BY "createdAt" DESC LIMIT 1`;
      voucher = Array.isArray(vouchers) ? vouchers[0] : null;
    } catch(e) {
      console.error('Voucher fetch error:', e);
    }
    console.log('Voucher Candidate:', JSON.stringify(voucher, null, 2));
  }

  await app.close();
}

bootstrap().catch(console.error);
