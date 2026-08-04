import { Test, TestingModule } from '@nestjs/testing';
import { TallyXmlParserService } from './xml-parser.service';
import { LoggerService } from '../../../core/logger/logger.service';

describe('TallyXmlParserService', () => {
  let service: TallyXmlParserService;
  let logger: any;

  beforeEach(async () => {
    logger = {
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TallyXmlParserService,
        { provide: LoggerService, useValue: logger },
      ],
    }).compile();

    service = module.get<TallyXmlParserService>(TallyXmlParserService);
  });

  describe('parse', () => {
    it('should handle HTTP transport failure', () => {
      const result = service.parse({ success: false, httpStatus: 500, rawResponse: '', durationMs: 100 });
      expect(result.success).toBe(false);
      expect(result.responseCode).toBe('TRANSPORT_ERROR');
    });

    it('should handle empty xml', () => {
      const result = service.parse({ success: true, httpStatus: 200, rawResponse: '   ', durationMs: 100 });
      expect(result.success).toBe(false);
      expect(result.responseCode).toBe('EMPTY_RESPONSE');
    });

    it('should handle malformed xml', () => {
      const result = service.parse({ success: true, httpStatus: 200, rawResponse: '<BAD></BAD>', durationMs: 100 });
      expect(result.success).toBe(false);
      expect(result.responseCode).toBe('MALFORMED_XML');
    });

    it('should parse success response using STATUS=1', () => {
      const xml = `<ENVELOPE><STATUS>1</STATUS><CREATED>1</CREATED><LASTVCHID>v-1</LASTVCHID></ENVELOPE>`;
      const result = service.parse({ success: true, httpStatus: 200, rawResponse: xml, durationMs: 50 });
      expect(result.success).toBe(true);
      expect(result.referenceId).toBe('v-1');
      expect(result.metadata?.status).toBe(1);
    });

    it('should parse success response using CREATED>0 fallback', () => {
      const xml = `<ENVELOPE><CREATED>1</CREATED><ERRORS>0</ERRORS><LASTVCHID>v-1</LASTVCHID></ENVELOPE>`;
      const result = service.parse({ success: true, httpStatus: 200, rawResponse: xml, durationMs: 50 });
      expect(result.success).toBe(true);
      expect(result.referenceId).toBe('v-1');
    });

    it('should parse failure response using STATUS=0', () => {
      const xml = `<ENVELOPE><STATUS>0</STATUS><LINEERROR>Ledger missing</LINEERROR></ENVELOPE>`;
      const result = service.parse({ success: true, httpStatus: 200, rawResponse: xml, durationMs: 50 });
      expect(result.success).toBe(false);
      expect(result.message).toBe('Ledger missing');
    });

    it('should parse failure response using ERRORS>0 fallback', () => {
      const xml = `<ENVELOPE><CREATED>0</CREATED><ERRORS>1</ERRORS><LINEERROR>Amount mismatch</LINEERROR></ENVELOPE>`;
      const result = service.parse({ success: true, httpStatus: 200, rawResponse: xml, durationMs: 50 });
      expect(result.success).toBe(false);
      expect(result.message).toBe('Amount mismatch');
    });

    it('should extract VCHNAME and WARNMSG', () => {
      const xml = `<ENVELOPE><STATUS>1</STATUS><VCHNAME>V-100</VCHNAME><WARNMSG>Amount rounded</WARNMSG></ENVELOPE>`;
      const result = service.parse({ success: true, httpStatus: 200, rawResponse: xml, durationMs: 50 });
      expect(result.voucherNumber).toBe('V-100');
      expect(result.parserWarnings).toContain('Tally warning: Amount rounded');
      expect(result.parserWarnings).toContain('Missing LASTVCHID in successful response'); // because success=true and no lastvchid
    });
  });
});
