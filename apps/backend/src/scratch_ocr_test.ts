import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { OcrController } from './modules/vendor-slip/api/ocr.controller';
import { PrismaService } from './infrastructure/database/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';

process.env.USE_UNIVERSAL_INGESTION = 'true';
process.env.WORKER_MODE = 'true';

async function verifyOCR() {
  const app = await NestFactory.createApplicationContext(AppModule);
  await app.init();

  const ocrController = app.get(OcrController);
  const prisma = app.get(PrismaService);

  const imagePath = 'C:\\Users\\Administrator\\.gemini\\antigravity-ide\\brain\\2c91d3b5-aba8-4de8-9ed8-d8a42e25c220\\media__1785789027368.png';
  const tenantId = 'system';
  
  if (!fs.existsSync(imagePath)) {
    console.error('Image not found:', imagePath);
    process.exit(1);
  }

  try {
    console.log('\n--- 1. UPLOAD DOCUMENT ---');
    const fileId = uuidv4();
    await prisma.document.create({
      data: {
        id: fileId,
        companyId: tenantId,
        fileUrl: imagePath,
        mimeType: 'image/png',
        checksum: 'dummy-checksum',
        uploadedBy: 'system',
        status: 'UPLOADED',
        source: 'MANUAL',
      },
    });
    console.log(`Document created: ${fileId}`);

    console.log('\n--- 2. OCR & EXTRACTION (Testing Resilience) ---');
    console.log('Calling OcrController.processInvoice...');
    const result = await ocrController.processInvoice(fileId);
    console.log('Result:', result);

  } catch (error: any) {
    console.error('\n--- FATAL ERROR ---');
    console.error(error.message);
    if (error.details) {
      console.error(JSON.stringify(error.details, null, 2));
    }
  } finally {
    await app.close();
  }
}

verifyOCR().catch(console.error);
