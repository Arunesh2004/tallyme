import 'dotenv/config';
import { TallyClient } from '../shared/tally/TallyClient';
import { TallyTransport } from '../shared/tally/TallyTransport';
import { defaultConfig } from '../shared/tally/config/TallyConfig';
import { MasterService } from '../modules/accounting/masters/services/MasterService';
import { TallyMasterRepository } from '../modules/accounting/masters/repositories/TallyMasterRepository';
import { CreateMasterDTO } from '../modules/accounting/masters/dto/CreateMasterDTO';
import { MasterType } from '../modules/accounting/masters/entities/MasterType';

async function main() {
  console.log("=========================================================");
  console.log("ACCOUNTING MASTER ENGINE VERIFICATION");
  console.log("=========================================================\n");

  const transport = new TallyTransport(defaultConfig);
  const tallyClient = new TallyClient(transport);
  const repository = new TallyMasterRepository(tallyClient);
  const masterService = new MasterService(repository);
  const companyName = 'Skyfall Legion Public School';

  console.log("1. Creating a Unit Master...");
  const unitDto: CreateMasterDTO = {
    masterType: MasterType.Unit,
    name: 'NOS', // Numbers
    formalName: 'Numbers',
    decimalPlaces: 0
  };

  let result = await masterService.createMaster(unitDto, companyName);
  console.log("Unit Creation Result:", result.success ? "SUCCESS" : "FAILED (or already exists)", result.message);

  console.log("\n2. Creating a Godown Master...");
  const godownDto: CreateMasterDTO = {
    masterType: MasterType.Godown,
    name: `Warehouse ${Date.now()}`,
    address: 'Sector 5, Industrial Area'
  };

  result = await masterService.createMaster(godownDto, companyName);
  console.log("Godown Creation Result:", result.success ? "SUCCESS" : "FAILED", result.message);

  console.log("\n3. Testing duplicate prevention (reading Voucher Types)...");
  result = await masterService.readMasters(MasterType.VoucherType);
  if (result.success && result.data) {
    console.log(`Successfully retrieved ${result.data.length} Voucher Types from Tally!`);
    if (result.data.length > 0) {
      console.log(`First Voucher Type:`, result.data[0]);
    }
  } else {
    console.log("Failed to retrieve Voucher Types:", result.message);
  }
}

main().catch((error) => {
  console.error("FATAL ERROR:", error);
  process.exit(1);
});
