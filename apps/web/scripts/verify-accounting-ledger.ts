import 'dotenv/config';
import { TallyClient } from '../shared/tally/TallyClient';
import { TallyTransport } from '../shared/tally/TallyTransport';
import { defaultConfig } from '../shared/tally/config/TallyConfig';
import { LedgerService } from '../modules/accounting/ledger/services/LedgerService';
import { PrismaLedgerRepository } from '../modules/accounting/ledger/repositories/PrismaLedgerRepository';
import { CreateLedgerDTO } from '../modules/accounting/ledger/dto/CreateLedgerDTO';

async function main() {
  console.log("=========================================================");
  console.log("ACCOUNTING LEDGER ENGINE VERIFICATION");
  console.log("=========================================================\n");

  const repository = new PrismaLedgerRepository();
  const ledgerService = new LedgerService(repository);

  // We test creating a new ledger
  const dto: CreateLedgerDTO = {
    name: `Test Vendor ${Date.now()}`, // unique name to avoid existing duplicates
    parentGroup: 'Sundry Creditors',
    openingBalance: 15000,
    openingBalanceType: 'Credit',
    state: 'Karnataka',
    pan: 'ABCDE1234F',
    gstDetails: {
      registrationType: 'Regular',
      gstin: '29ABCDE1234F1Z5' // Valid structure: 29 + PAN + 1Z5
    }
  };

  console.log("Submitting Ledger:");
  console.dir(dto, { depth: null });
  console.log("\n...");

  const result = await ledgerService.createLedger(dto, 'Skyfall Legion Public School');

  console.log("\nResult:");
  console.dir(result, { depth: null });

  if (!result.success) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("FATAL ERROR:", error);
  process.exit(1);
});
