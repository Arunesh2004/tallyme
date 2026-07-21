import 'dotenv/config';
import { prisma } from '../shared/db/prisma';
import { OutboxDispatcher } from '../modules/accounting/sync/dispatcher/OutboxDispatcher';
import { SyncQueueService } from '../modules/accounting/sync/queue/SyncQueueService';
import { SyncWorker } from '../modules/accounting/sync/worker/SyncWorker';
import { TallyClient } from '../shared/tally/TallyClient';
import { TallyTransport } from '../shared/tally/TallyTransport';
import { defaultConfig } from '../shared/tally/config/TallyConfig';
import { PrismaVoucherRepository } from '../modules/accounting/voucher/repositories/PrismaVoucherRepository';
import { VoucherType } from '../modules/accounting/voucher/enums/VoucherType';
import { EventStatus } from '@prisma/client';

async function main() {
  console.log("=========================================================");
  console.log("REALTIME SYNC ENGINE VERIFICATION");
  console.log("=========================================================\n");

  const transport = new TallyTransport(defaultConfig);
  const tallyClient = new TallyClient(transport);

  // Initialize Sync Pipeline Components
  const queueService = new SyncQueueService();
  const dispatcher = new OutboxDispatcher(queueService);
  const worker = new SyncWorker(tallyClient);

  console.log("1. Creating a new Voucher in Local DB (simulate API request)...");
  const voucherRepo = new PrismaVoucherRepository();
  const voucherDto = {
    voucherType: VoucherType.Sales,
    date: new Date(),
    narration: 'Sync Engine Verification'
  };
  
  const result = await voucherRepo.saveVoucher(voucherDto as any);
  
  if (!result.success) {
    console.error("Failed to save voucher:", result.message);
    process.exit(1);
  }
  console.log("✅ Voucher persisted securely. EventOutbox inserted with PENDING state.");

  console.log("\n2. Dispatcher identifying PENDING events...");
  const dispatchedCount = await dispatcher.dispatchPendingEvents();
  console.log(`✅ Dispatcher locked and enqueued ${dispatchedCount} events into BullMQ.`);

  console.log("\n3. Worker processing jobs (simulate async wait)...");
  
  // Wait for BullMQ job to be processed by the worker listening on the queue
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log("\n4. Verifying resulting Sync statuses in DB...");

  // We find the last event we just dispatched (ideally by the voucher ID if we had it, but for script simplicity we'll just query the latest).
  const latestEvent = await prisma.eventOutbox.findFirst({
    orderBy: { createdAt: 'desc' }
  });

  if (latestEvent) {
    console.log(`Event ID: ${latestEvent.eventId}`);
    console.log(`Event Status: ${latestEvent.status}`);

    if (latestEvent.status === EventStatus.PUBLISHED) {
      console.log("✅ SUCCESS! Event successfully published to Tally.");
    } else if (latestEvent.status === EventStatus.FAILED) {
      console.log(`❌ EVENT FAILED: ${latestEvent.lastError}`);
    } else {
      console.log(`⚠️ Event is still ${latestEvent.status}. Ensure Redis is running and Tally is accessible.`);
    }

    const metric = await prisma.syncMetric.findFirst({
      where: { eventId: latestEvent.eventId }
    });

    if (metric) {
      console.log(`✅ SyncMetric logged: Duration ${metric.durationMs}ms, Retries: ${metric.retryCount}, Status: ${metric.status}`);
    }
  }

  // Cleanup
  await worker.close();
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("FATAL ERROR:", error);
  await prisma.$disconnect();
  process.exit(1);
});
