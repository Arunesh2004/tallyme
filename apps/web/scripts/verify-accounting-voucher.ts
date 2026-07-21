import 'dotenv/config';
import { TallyClient } from '../shared/tally/TallyClient';
import { TallyTransport } from '../shared/tally/TallyTransport';
import { defaultConfig } from '../shared/tally/config/TallyConfig';
import { VoucherService } from '../modules/accounting/voucher/services/VoucherService';
import { PrismaVoucherRepository } from '../modules/accounting/voucher/repositories/PrismaVoucherRepository';
import { CreateVoucherDTO } from '../modules/accounting/voucher/dto/CreateVoucherDTO';
import { VoucherType } from '../modules/accounting/voucher/enums/VoucherType';

async function main() {
  console.log("=========================================================");
  console.log("ACCOUNTING VOUCHER ENGINE VERIFICATION");
  console.log("=========================================================\n");

  const repository = new PrismaVoucherRepository();
  const voucherService = new VoucherService(repository);
  const transport = new TallyTransport(defaultConfig);
  const tallyClient = new TallyClient(transport);

  console.log("Creating 'Sales' ledger just in case...");
  const createLedgerXml = `<ENVELOPE>
    <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
    <BODY>
      <IMPORTDATA>
        <REQUESTDESC>
          <REPORTNAME>All Masters</REPORTNAME>
          <STATICVARIABLES>
            <SVCURRENTCOMPANY>Skyfall Legion Public School</SVCURRENTCOMPANY>
          </STATICVARIABLES>
        </REQUESTDESC>
        <REQUESTDATA>
          <TALLYMESSAGE xmlns:UDF="TallyUDF">
            <LEDGER NAME="Sales" ACTION="Create">
              <NAME>Sales</NAME>
              <PARENT>Sales Accounts</PARENT>
            </LEDGER>
          </TALLYMESSAGE>
        </REQUESTDATA>
      </IMPORTDATA>
    </BODY>
  </ENVELOPE>`;
  await tallyClient.sendXml(createLedgerXml);
  console.log("Ledger creation complete.\n");

  const dto: CreateVoucherDTO = {
    voucherType: VoucherType.Sales,
    date: '2024-05-01', // Try 2024 financial year
    narration: 'Test Sales Voucher from Next.js Integration',
    ledgerEntries: [
      {
        ledgerName: 'Cash',
        amount: 500,
        isDeemedPositive: true // Debit
      },
      {
        ledgerName: 'Sales',
        amount: 500,
        isDeemedPositive: false // Credit
      }
    ]
  };

  console.log("Submitting Voucher:");
  console.dir(dto, { depth: null });
  console.log("\n...");

  const result = await voucherService.createVoucher(dto);

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
