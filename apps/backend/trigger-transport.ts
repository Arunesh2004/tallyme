import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { TallyXmlBuilderService } from './src/modules/erp-connector/services/xml-builder.service';
import { TallyPrimeAdapter } from './src/modules/erp-connector/adapters/tally-prime.adapter';
import { TallyTransportService } from './src/modules/erp-connector/services/transport.service';
import * as crypto from 'crypto';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const xmlBuilder = app.get(TallyXmlBuilderService);
  const adapter = app.get(TallyPrimeAdapter);
  const transport = app.get(TallyTransportService);

  // Canonical voucher DTO
  const dto: any = {
    voucherNumber: 'V-12345',
    voucherType: 'Journal',
    date: '20260727',
    companyId: 'system',
    partyLedgerName: 'TEST_VENDOR_LEDGER',
    isEdit: false,
    lines: [
      { ledgerName: 'TEST_VENDOR_LEDGER', isDebit: false, amount: 1000, isParty: true },
      { ledgerName: 'TEST_VENDOR_EXPENSE', isDebit: true,  amount: 1000, isParty: false },
    ],
  };

  // ── STAGE 1: xmlBuilder output ────────────────────────────────────────────
  const xmlBuilderOutput = await xmlBuilder.buildVoucherXml(dto);
  const xmlBuilderBuf = Buffer.from(xmlBuilderOutput, 'utf8');
  const xmlBuilderHash = crypto.createHash('sha256').update(xmlBuilderBuf).digest('hex');

  fs.writeFileSync('xmlbuilder-output.xml', xmlBuilderOutput, 'utf8');
  console.log('=== STAGE 1: xmlBuilder.buildVoucherXml() ===');
  console.log('String length :', xmlBuilderOutput.length);
  console.log('Buffer length :', xmlBuilderBuf.length);
  console.log('SHA256        :', xmlBuilderHash);
  console.log('');

  // ── STAGE 2: adapter.buildPayload() output ────────────────────────────────
  const adapterPayload = await adapter.buildPayload(dto);
  const adapterBuf = Buffer.from(adapterPayload, 'utf8');
  const adapterHash = crypto.createHash('sha256').update(adapterBuf).digest('hex');

  fs.writeFileSync('adapterpayload-output.xml', adapterPayload, 'utf8');
  console.log('=== STAGE 2: adapter.buildPayload() ===');
  console.log('String length :', adapterPayload.length);
  console.log('Buffer length :', adapterBuf.length);
  console.log('SHA256        :', adapterHash);
  console.log('SHA256 === xmlBuilder?', adapterHash === xmlBuilderHash ? 'YES — IDENTICAL' : 'NO — DIFFERENT');
  console.log('');

  // ── STAGE 3: transport.send() — exact bytes on the wire ───────────────────
  console.log('=== STAGE 3: transport.send() (transport-final.xml written inside) ===');
  try {
    await transport.send(adapterPayload, {
      voucherId: 'forensic-test',
      jobId: 'forensic-job',
      queueName: 'tally-sync',
      attemptNumber: 1,
    });
  } catch (e: any) {
    console.error('Transport error:', e.message);
  }

  // ── STAGE 4: compare transport-final.xml hash ────────────────────────────
  if (fs.existsSync('transport-final.xml')) {
    const transportBuf = fs.readFileSync('transport-final.xml');
    const transportHash = crypto.createHash('sha256').update(transportBuf).digest('hex');
    console.log('');
    console.log('=== STAGE 4: transport-final.xml hash comparison ===');
    console.log('SHA256 transport-final.xml:', transportHash);
    console.log('SHA256 adapterPayload     :', adapterHash);
    console.log('SHA256 xmlBuilder         :', xmlBuilderHash);
    console.log('transport === adapter?    :', transportHash === adapterHash ? 'YES — IDENTICAL' : 'NO — DIFFERENT');
    console.log('transport === xmlBuilder? :', transportHash === xmlBuilderHash ? 'YES — IDENTICAL' : 'NO — DIFFERENT');
  }

  await app.close();
}
bootstrap();
