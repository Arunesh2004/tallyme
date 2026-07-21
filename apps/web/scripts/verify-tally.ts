import 'dotenv/config';
import { TallyTransport } from '../shared/tally/TallyTransport';
import { TallyClient } from '../shared/tally/TallyClient';
import { TallyConnection } from '../shared/tally/TallyConnection';
import { defaultConfig } from '../shared/tally/config/TallyConfig';
import { TallyError } from '../shared/tally/TallyError';

async function main() {
  console.log('ENTER verify-tally.ts main()');
  console.log('=========================================================');
  console.log('TALLY PRIME CONNECTOR VERIFICATION');
  console.log('=========================================================\n');

  console.log(`Connecting to Tally at http://${defaultConfig.host}:${defaultConfig.port}...`);

  const transport = new TallyTransport(defaultConfig);
  const client = new TallyClient(transport);
  const connection = new TallyConnection(transport);

  try {
    // 1. Verify Connection
    const health = await connection.health();
    if (health !== 'HEALTHY') {
      console.error('❌ Connection Failed: Tally Prime is unreachable.');
      process.exit(1);
    }
    console.log('✓ Connected (HEALTHY)\n');

    // 2. Read Company
    console.log('--------------------------------');
    console.log('Fetching Company Data...');
    const companies = await client.getCompany();
    console.log('Company:');
    console.log(JSON.stringify(companies, null, 2));
    console.log('\n');

    // 3. Read Ledgers
    console.log('--------------------------------');
    console.log('Fetching Ledgers...');
    const ledgers = await client.getLedgers();
    console.log(`Ledgers (${ledgers.length} found):`);
    // Print first 5 to avoid flooding the console
    console.log(JSON.stringify(ledgers.slice(0, 5), null, 2));
    if (ledgers.length > 5) console.log(`... and ${ledgers.length - 5} more.`);
    console.log('\n');

    // 4. Read Voucher Types
    console.log('--------------------------------');
    console.log('Fetching Voucher Types...');
    const voucherTypes = await client.getVoucherTypes();
    console.log(`Voucher Types (${voucherTypes.length} found):`);
    console.log(JSON.stringify(voucherTypes.slice(0, 5), null, 2));
    if (voucherTypes.length > 5) console.log(`... and ${voucherTypes.length - 5} more.`);
    console.log('\n');

    console.log('=========================================================');
    console.log('VERIFICATION SUCCESSFUL');
    console.log('=========================================================');
    process.exit(0);

  } catch (error: any) {
    console.log('\n=========================================================');
    console.error('❌ VERIFICATION FAILED\n');

    if (error instanceof TallyError) {
      console.error(`TallyError [${error.code}]: ${error.message}`);
    } else {
      console.error('Unknown Error:');
      console.error(error.message);
    }
    
    console.error('\nStack Trace:');
    console.error(error.stack);
    console.log('=========================================================');
    process.exit(1);
  }
}

main();
