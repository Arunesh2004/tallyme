import 'dotenv/config';
import { prisma } from '../shared/db/prisma';
import { MasterService } from '../modules/accounting/masters/services/MasterService';
import { PrismaMasterRepository } from '../modules/accounting/masters/repositories/PrismaMasterRepository';
import { CreateMasterDTO } from '../modules/accounting/masters/dto/CreateMasterDTO';
import { MasterType } from '../modules/accounting/masters/entities/MasterType';

async function main() {
  console.log("=========================================================");
  console.log("PERSISTENCE & OUTBOX VERIFICATION");
  console.log("=========================================================\n");

  const repository = new PrismaMasterRepository();
  const masterService = new MasterService(repository);
  const companyName = 'Skyfall Legion Public School';

  console.log("1. Creating a Godown Master in DB and Outbox...");
  const godownName = `Warehouse ${Date.now()}`;
  const godownDto: CreateMasterDTO = {
    masterType: MasterType.Godown,
    name: godownName,
    address: 'Sector 5, DB Test Area'
  };

  const result = await masterService.createMaster(godownDto, companyName);
  console.log("Service Result:", result.success ? "SUCCESS" : "FAILED", result.message);

  if (result.success) {
    console.log("\n2. Verifying DB Persistence...");
    
    // Check AccountingMaster table
    const dbMaster = await prisma.accountingMaster.findFirst({
      where: { name: godownName }
    });

    if (dbMaster) {
      console.log(`✅ Master found in AccountingMaster table! ID: ${dbMaster.id}`);
      
      // Check EventOutbox table
      const outboxEvent = await prisma.eventOutbox.findFirst({
        where: { aggregateId: dbMaster.id }
      });

      if (outboxEvent) {
        console.log(`✅ Outbox Event found in EventOutbox table! Event ID: ${outboxEvent.eventId}`);
        console.log(`   Type: ${outboxEvent.eventType}`);
        console.log(`   Status: ${outboxEvent.status}`);
      } else {
        console.error("❌ Outbox Event NOT found!");
      }
    } else {
      console.error("❌ Master NOT found in DB!");
    }
  }

  // Disconnect prisma
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("FATAL ERROR:", error);
  await prisma.$disconnect();
  process.exit(1);
});
