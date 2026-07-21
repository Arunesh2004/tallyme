import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../../../src/core/logger/logger.service';
import { TallyTransportService } from '../services/transport.service';
import { TallyXmlBuilderService } from '../services/xml-builder.service';
import { TallyXmlParserService } from '../services/xml-parser.service';
import { ConfigCompanyResolver } from '../services/company-resolver.service';
import { TallyVoucherDTO } from '../dto/tally-voucher.dto';
import { getTodayTallyDate } from './date-helper';

describe('Live Tally Roundtrip Validation', () => {
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

  it('should create a voucher and then retrieve and compare it', async () => {
    const voucherNumber = 'RND-LIVE-' + Date.now();
    const date = getTodayTallyDate();
    const narration = 'Live roundtrip test';

    const dto: TallyVoucherDTO = {
      voucherNumber,
      voucherType: 'Journal',
      date,
      narration,
      isEdit: false,
      lines: [
        {
          ledgerName: 'Test Vendor',
          amount: 333,
          isDebit: true,
          isParty: false,
        },
        {
          ledgerName: 'Bank Account',
          amount: 333,
          isDebit: false,
          isParty: false,
        },
      ],
    };

    // 1. Create the Voucher
    const xml = builder.buildVoucherXml(dto);
    const result = await transport.send(xml, {
      voucherId: voucherNumber,
      jobId: 'roundtrip-1',
      attemptNumber: 1,
    });
    const parsed = parser.parse(result);
    expect(parsed.success).toBe(true);

    // 2. Retrieve the created voucher
    const exportXml = builder.buildExportXml(voucherNumber);
    const verifyRes = await transport.send(exportXml, {
      voucherId: voucherNumber,
      jobId: 'roundtrip-verify',
      attemptNumber: 1,
    });
    expect(verifyRes.success).toBe(true);

    const responseContent = verifyRes.rawResponse;

    // 3. Compare properties
    // Tally returns dates in YYYYMMDD format in XML
    expect(responseContent).toContain(`<DATE>${date}</DATE>`);
    expect(responseContent).toContain(`<NARRATION>${narration}</NARRATION>`);

    // Ledger names should be present
    expect(responseContent).toContain(`<LEDGERNAME>Test Vendor</LEDGERNAME>`);
    expect(responseContent).toContain(`<LEDGERNAME>Bank Account</LEDGERNAME>`);

    // Verify amounts (Tally typically puts negative for Debit and positive for Credit internally, or vice-versa depending on the exact XML export format)
    expect(responseContent).toContain(`333`);
  });
});
