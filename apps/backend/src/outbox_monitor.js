const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();
const outfile = 'outbox_monitor.log';

console.log("Starting rapid Outbox monitoring...");
fs.writeFileSync(outfile, "=== OUTBOX CAPTURE ===\n");

let running = true;
const knownEvents = new Set();

async function poll() {
  while(running) {
    try {
      const events = await prisma.outboxEvent.findMany({
        take: 10
      });
      for (const ev of events) {
        if (!knownEvents.has(ev.id)) {
          knownEvents.add(ev.id);
          const logMsg = `CAPTURED EVENT [${new Date().toISOString()}]: ${ev.eventType} - ID: ${ev.id}\n${JSON.stringify(ev.payload)}\n\n`;
          console.log(logMsg);
          fs.appendFileSync(outfile, logMsg);
        }
      }
    } catch(e) {}
    await new Promise(r => setTimeout(r, 50)); // Poll every 50ms
  }
}

poll();

setTimeout(() => {
  running = false;
  console.log("Stopping outbox monitor.");
  prisma.$disconnect();
}, 90000); // Stop after 90 seconds
