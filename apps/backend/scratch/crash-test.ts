import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { BullMqService } from '../src/infrastructure/queue/bullmq.service';
import { randomUUID } from 'crypto';

async function bootstrap() {
  console.log('--- STARTING CRASH TEST ---');
  process.env.WORKER_MODE = 'true';
  const app = await NestFactory.createApplicationContext(AppModule);
  await app.init();

  const prisma = app.get(PrismaService);
  const bullmq = app.get(BullMqService);

  // Monkey-patch Prisma to simulate a crash immediately after create
  const originalCreate = prisma.documentReviewQueue.create;
  (prisma.documentReviewQueue.create as any) = async function (args: any) {
    console.log('[CRASH TEST] Intercepted documentReviewQueue.create()');
    const result = await originalCreate.call(this, args);
    console.log('[CRASH TEST] Record created successfully. SIMULATING KUBERNETES SIGTERM NOW!');
    
    // Simulate sudden process death before InvoiceCandidate is updated
    process.exit(1); 
  };

  const fileId = randomUUID();
  const candidateId = randomUUID();

  // Create fake document
  await prisma.document.create({
    data: {
      id: fileId,
      fileUrl: '/dev/null',
      checksum: randomUUID(),
      mimeType: 'image/png',
      status: 'UPLOADED',
      uploadedBy: 'crash-test',
      source: 'MANUAL_UPLOAD',
    }
  });

  // Create fake candidate
  await prisma.invoiceCandidate.create({
    data: {
      id: candidateId,
      documentId: fileId,
      status: 'QUEUED',
      extractedName: 'Low Confidence Vendor',
      extractedData: { confidence: 10 },
    }
  });

  console.log(`[CRASH TEST] Enqueuing candidate ${candidateId} to vendor-slip-queue`);
  await bullmq.addJob('vendor-slip-queue', 'process-vendor-slip', { candidateId, companyId: 'COMP-1' }, { attempts: 3 });

  console.log('[CRASH TEST] Waiting for worker to process and crash...');
}

bootstrap();
