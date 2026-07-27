import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { TallyXmlBuilderService } from './src/modules/erp-connector/services/xml-builder.service';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const xmlBuilder = app.get(TallyXmlBuilderService);

  const dto = {
    voucherNumber: 'V-12345',
    voucherType: 'Journal',
    date: '20260727',
    companyId: 'system',
    partyLedgerName: 'TEST_VENDOR_LEDGER',
    isEdit: false,
    lines: [
      {
        ledgerName: 'TEST_VENDOR_LEDGER',
        isDebit: false,
        amount: 1000,
        isParty: true
      },
      {
        ledgerName: 'TEST_VENDOR_EXPENSE',
        isDebit: true,
        amount: 1000,
        isParty: false
      }
    ]
  };

  const xml = await xmlBuilder.buildVoucherXml(dto as any);
  fs.writeFileSync('tally-request.xml', xml);
  console.log('Saved to tally-request.xml');

  await app.close();
}
bootstrap();
