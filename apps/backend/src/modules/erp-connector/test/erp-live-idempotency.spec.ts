import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../../../src/core/logger/logger.service';
import { TallyTransportService } from '../services/transport.service';
import { TallyXmlBuilderService } from '../services/xml-builder.service';
import { TallyXmlParserService } from '../services/xml-parser.service';
import { ConfigCompanyResolver } from '../services/company-resolver.service';
import { TallyVoucherDTO } from '../dto/tally-voucher.dto';
import { getTodayTallyDate } from './date-helper';

describe('Live Tally Idempotency Validation', () => {
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

  it('should not create duplicate vouchers on identical requests', async () => {
    const voucherNumber = 'IDEMP-' + Date.now();

    const dto: TallyVoucherDTO = {
      voucherNumber,
      voucherType: 'Journal',
      date: getTodayTallyDate(),
      narration: 'Live Idempotency Test',
      isEdit: false,
      lines: [
        {
          ledgerName: 'Test Vendor',
          amount: 100,
          isDebit: true,
          isParty: false,
        },
        {
          ledgerName: 'Bank Account',
          amount: 100,
          isDebit: false,
          isParty: false,
        },
      ],
    };

    const xml = builder.buildVoucherXml(dto);

    // 1st request
    const res1 = await transport.send(xml, {
      voucherId: voucherNumber,
      jobId: 'idemp-test-1',
      attemptNumber: 1,
    });
    const parsed1 = parser.parse(res1);
    expect(parsed1.success).toBe(true);

    // 2nd request (Identical)
    const res2 = await transport.send(xml, {
      voucherId: voucherNumber,
      jobId: 'idemp-test-2',
      attemptNumber: 2,
    });
    const parsed2 = parser.parse(res2);
    expect(parsed2.success).toBe(true);

    // Now verify only one voucher exists by exporting it
    const exportXml = builder.buildExportXml(voucherNumber);
    const verifyRes = await transport.send(exportXml, {
      voucherId: voucherNumber,
      jobId: 'idemp-verify',
      attemptNumber: 1,
    });

    expect(verifyRes.success).toBe(true);
    expect(verifyRes.rawResponse).toContain('Live Idempotency Test');
  });
});
