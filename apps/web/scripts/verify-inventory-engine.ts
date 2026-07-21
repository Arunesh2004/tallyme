import 'dotenv/config';
import { prisma } from '../shared/db/prisma';
import { OutboxDispatcher } from '../modules/accounting/sync/dispatcher/OutboxDispatcher';
import { SyncQueueService } from '../modules/accounting/sync/queue/SyncQueueService';
import { SyncWorker } from '../modules/accounting/sync/worker/SyncWorker';
import { TallyClient } from '../shared/tally/TallyClient';
import { TallyTransport } from '../shared/tally/TallyTransport';
import { defaultConfig } from '../shared/tally/config/TallyConfig';
import { EventStatus } from '@prisma/client';
import { StockItemCreated } from '../modules/inventory/shared/events/InventoryEvents';
import { v4 as uuidv4 } from 'uuid';

async function main() {
  console.log("=========================================================");
  console.log("INVENTORY ENGINE VERIFICATION");
  console.log("=========================================================\n");

  const transport = new TallyTransport(defaultConfig);
  const tallyClient = new TallyClient(transport);

  // Initialize Sync Pipeline Components
  const queueService = new SyncQueueService();
  const dispatcher = new OutboxDispatcher(queueService);
  const worker = new SyncWorker(tallyClient);

  console.log("1. Creating a new StockItem in Local DB...");
  
  const result = await prisma.$transaction(async (tx) => {
    const stockItem = await tx.inventoryStockItem.create({
      data: {
        name: 'MacBook Pro M3 Max',
        sku: 'MBP-M3-MAX-001',
        unit: 'Nos',
        stockGroup: 'Laptops',
        payload: { name: 'MacBook Pro M3 Max', sku: 'MBP-M3-MAX-001', unit: 'Nos' },
        organizationId: 'org_default'
      }
    });

    const event = new StockItemCreated(stockItem.id, 'StockItem', stockItem.payload, uuidv4());
    
    await tx.eventOutbox.create({
      data: {
        eventId: uuidv4(),
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        eventType: event.eventType,
        payload: JSON.parse(JSON.stringify(event.payload)),
        correlationId: event.correlationId,
        status: EventStatus.PENDING,
        organizationId: 'org_default'
      }
    });
    return stockItem;
  });
  
  console.log("✅ StockItem persisted securely. EventOutbox inserted with PENDING state.");

  console.log("\n2. Dispatcher identifying PENDING inventory events...");
  const dispatchedCount = await dispatcher.dispatchPendingEvents();
  console.log(`✅ Dispatcher locked and enqueued ${dispatchedCount} events into BullMQ.`);

  console.log("\n3. Worker processing jobs using InventorySyncHandlers (simulate async wait)...");
  
  // Wait for BullMQ job to be processed by the worker listening on the queue
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log("\n4. Verifying resulting Sync statuses in DB...");

  const latestEvent = await prisma.eventOutbox.findFirst({
    where: { aggregateId: result.id },
    orderBy: { createdAt: 'desc' }
  });

  if (latestEvent) {
    console.log(`Event ID: ${latestEvent.eventId}`);
    console.log(`Event Status: ${latestEvent.status}`);

    if (latestEvent.status === EventStatus.PUBLISHED) {
      console.log("✅ SUCCESS! Inventory Event successfully published to Tally.");
    } else if (latestEvent.status === EventStatus.FAILED) {
      console.log(`❌ EVENT FAILED: ${latestEvent.lastError}`);
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
