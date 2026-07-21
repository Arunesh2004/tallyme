import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../../../src/core/logger/logger.service';
import { TallyTransportService } from '../services/transport.service';
import { TallyXmlBuilderService } from '../services/xml-builder.service';
import { TallyXmlParserService } from '../services/xml-parser.service';
import { ConfigCompanyResolver } from '../services/company-resolver.service';
import { TallyVoucherDTO } from '../dto/tally-voucher.dto';
import { getTodayTallyDate } from './date-helper';

describe('Live Tally Voucher Validation', () => {
  let transport: TallyTransportService;
  let builder: TallyXmlBuilderService;
  let parser: TallyXmlParserService;

  beforeAll(() => {
    const configService = new ConfigService({
      TALLY_HOST: 'localhost',
      TALLY_PORT: '9000',
      TALLY_TIMEOUT_MS: '10000',
      TALLY_COMPANY_NAME: '',
    });
    const mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as LoggerService;

    transport = new TallyTransportService(configService, mockLogger);
    const resolver = new ConfigCompanyResolver(configService);
    builder = new TallyXmlBuilderService(resolver);
    parser = new TallyXmlParserService(mockLogger);
  });

  async function createLedgerIfNotExists(ledgerName: string) {
    const xml = `<ENVELOPE>
  <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="${ledgerName}" ACTION="Create">
            <NAME>${ledgerName}</NAME>
            <PARENT>Sundry Debtors</PARENT>
            <OPENINGBALANCE>0</OPENINGBALANCE>
          </LEDGER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
    await transport.send(xml, {
      voucherId: 'setup',
      jobId: 'setup',
      attemptNumber: 1,
    });
  }

  beforeAll(async () => {
    await createLedgerIfNotExists('Bank Account');
    await createLedgerIfNotExists('Test Vendor');
  });

  it('should successfully create a Receipt Voucher', async () => {
    const dto: TallyVoucherDTO = {
      voucherNumber: 'RCT-LIVE-' + Date.now(),
      voucherType: 'Receipt',
      date: getTodayTallyDate(),
      narration: 'Live integration test receipt',
      partyLedgerName: 'Test Vendor',
      isEdit: false,
      lines: [
        {
          ledgerName: 'Bank Account',
          amount: 1500,
          isDebit: true,
          isParty: false,
        },
        {
          ledgerName: 'Test Vendor',
          amount: 1500,
          isDebit: false,
          isParty: true,
        },
      ],
    };

    const xml = builder.buildVoucherXml(dto);
    const result = await transport.send(xml, {
      voucherId: dto.voucherNumber,
      jobId: 'test1',
      attemptNumber: 1,
    });

    expect(result.success).toBe(true);
    const parsed = parser.parse(result);
    if (!parsed.success) {
      console.log('TALLY ERROR:', parsed.message, result.rawResponse);
    }
    expect(parsed.success).toBe(true);
  });

  it('should successfully create a Payment Voucher', async () => {
    const dto: TallyVoucherDTO = {
      voucherNumber: 'PAY-LIVE-' + Date.now(),
      voucherType: 'Payment',
      date: getTodayTallyDate(),
      narration: 'Live integration test payment',
      partyLedgerName: 'Test Vendor',
      isEdit: false,
      lines: [
        {
          ledgerName: 'Test Vendor',
          amount: 500,
          isDebit: true,
          isParty: true,
        },
        {
          ledgerName: 'Bank Account',
          amount: 500,
          isDebit: false,
          isParty: false,
        },
      ],
    };

    const xml = builder.buildVoucherXml(dto);
    const result = await transport.send(xml, {
      voucherId: dto.voucherNumber,
      jobId: 'test2',
      attemptNumber: 1,
    });

    const parsed = parser.parse(result);
    expect(parsed.success).toBe(true);
  });
});
