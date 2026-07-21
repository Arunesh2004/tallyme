import 'dotenv/config';
import { prisma } from '../shared/db/prisma';
import { IngestionOrchestrator } from '../modules/student-fees/ingestion/services/IngestionOrchestrator';
import { PrismaIngestionMessageRepository } from '../modules/student-fees/ingestion/repositories/PrismaIngestionMessageRepository';
import { MessageProvider } from '../modules/student-fees/ingestion/adapters/MessageProvider';
import { NormalizedMessage } from '../modules/student-fees/ingestion/types/IngestionTypes';

class MockMessageProvider implements MessageProvider {
  public providerName = 'MOCK_PROVIDER';

  async authenticate(): Promise<void> {
    console.log('Mock Provider Authenticated');
  }

  async fetchNewMessages(): Promise<NormalizedMessage[]> {
    const freshMessage: NormalizedMessage = {
      provider: this.providerName,
      messageId: 'msg-101',
      subject: 'Payment Confirmation: John Doe',
      fromEmail: 'payments@bank.com',
      bodyText: 'Transaction 987654321 successful for Rs 5000.',
      receivedAt: new Date(),
      rawPayload: {}
    };

    const duplicateMessageId: NormalizedMessage = {
      provider: this.providerName,
      messageId: 'msg-101', // Identical ID
      subject: 'Different Subject',
      fromEmail: 'payments@bank.com',
      bodyText: 'Different body.',
      receivedAt: new Date(),
      rawPayload: {}
    };

    const duplicatePayloadHash: NormalizedMessage = {
      provider: this.providerName,
      messageId: 'msg-102', // New ID
      subject: 'Payment Confirmation: John Doe', // Same semantics
      fromEmail: 'payments@bank.com',
      bodyText: 'Transaction 987654321 successful for Rs 5000.',
      receivedAt: new Date(),
      rawPayload: {}
    };

    return [freshMessage, duplicateMessageId, duplicatePayloadHash];
  }
}

async function main() {
  console.log("=========================================================");
  console.log("STUDENT FEE INGESTION VERIFICATION");
  console.log("=========================================================\n");

  const repository = new PrismaIngestionMessageRepository();
  const mockProvider = new MockMessageProvider();
  
  const orchestrator = new IngestionOrchestrator(repository, [mockProvider]);

  console.log("1. Cleaning up existing mock data...");
  await prisma.eventOutbox.deleteMany({ where: { eventType: 'StudentFeeMessageReceived' } });
  await prisma.ingestionMessage.deleteMany({ where: { provider: 'MOCK_PROVIDER' } });

  console.log("\n2. Executing Polling Orchestrator...");
  console.log("Injecting 3 messages: [1 Fresh, 1 Duplicate ID, 1 Duplicate Hash]");
  
  await orchestrator.pollAll();

  console.log("\n3. Verifying Results...");
  
  const ingestionCount = await prisma.ingestionMessage.count({ where: { provider: 'MOCK_PROVIDER' } });
  const outboxCount = await prisma.eventOutbox.count({ where: { eventType: 'StudentFeeMessageReceived' } });

  console.log(`IngestionMessages Persisted: ${ingestionCount} (Expected: 1)`);
  console.log(`EventOutbox Events Created: ${outboxCount} (Expected: 1)`);

  if (ingestionCount === 1 && outboxCount === 1) {
    console.log("✅ SUCCESS! Both Message ID and Payload Hash deduplication worked flawlessly.");
  } else {
    console.log("❌ FAILURE! Deduplication failed.");
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("FATAL ERROR:", error);
  await prisma.$disconnect();
  process.exit(1);
});
