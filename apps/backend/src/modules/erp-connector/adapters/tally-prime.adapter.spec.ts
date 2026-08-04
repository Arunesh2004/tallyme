import { Test, TestingModule } from '@nestjs/testing';
import { TallyPrimeAdapter } from './tally-prime.adapter';
import { TallyXmlBuilderService } from '../services/xml-builder.service';
import { TallyTransportService } from '../services/transport.service';
import { TallyXmlParserService } from '../services/xml-parser.service';
import { ERPRequestContext } from '../dto/transport.dto';

describe('TallyPrimeAdapter', () => {
  let adapter: TallyPrimeAdapter;

  const mockXmlBuilder = {
    buildVoucherXml: jest.fn(),
    buildExportXml: jest.fn(),
  };

  const mockTransport = {
    checkHealth: jest.fn(),
    send: jest.fn(),
  };

  const mockXmlParser = {
    parse: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TallyPrimeAdapter,
        { provide: TallyXmlBuilderService, useValue: mockXmlBuilder },
        { provide: TallyTransportService, useValue: mockTransport },
        { provide: TallyXmlParserService, useValue: mockXmlParser },
      ],
    }).compile();

    adapter = module.get<TallyPrimeAdapter>(TallyPrimeAdapter);
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  describe('connect', () => {
    it('should delegate to transport health check', async () => {
      mockTransport.checkHealth.mockResolvedValue(true);
      const result = await adapter.connect();
      expect(result).toBe(true);
      expect(mockTransport.checkHealth).toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('should do nothing', async () => {
      await expect(adapter.disconnect()).resolves.toBeUndefined();
    });
  });

  describe('healthCheck', () => {
    it('should return transport health', async () => {
      mockTransport.checkHealth.mockResolvedValue(false);
      const result = await adapter.healthCheck();
      expect(result).toBe(false);
    });
  });

  describe('buildPayload', () => {
    it('should delegate to XML builder', async () => {
      mockXmlBuilder.buildVoucherXml.mockResolvedValue('<xml/>');
      const result = await adapter.buildPayload({} as any);
      expect(result).toBe('<xml/>');
    });
  });

  describe('sendVoucher', () => {
    it('should delegate to transport', async () => {
      mockTransport.send.mockResolvedValue({ success: true, rawResponse: 'ok' });
      const context: ERPRequestContext = { companyId: 'c-1', voucherId: 'v-1' };
      
      const result = await adapter.sendVoucher('<payload/>', context);
      
      expect(result).toEqual({ success: true, rawResponse: 'ok' });
      expect(mockTransport.send).toHaveBeenCalledWith('<payload/>', context);
    });
  });

  describe('parseResponse', () => {
    it('should delegate to XML parser', () => {
      const mockResult: any = { success: true, rawResponse: 'res', httpStatus: 200, durationMs: 10 };
      mockXmlParser.parse.mockReturnValue({ success: true, originalVoucherId: 'v1' });
      
      const result = adapter.parseResponse(mockResult);
      
      expect(result.success).toBe(true);
      expect(mockXmlParser.parse).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('validateResponse', () => {
    it('should return true if parsed response is successful', () => {
      expect(adapter.validateResponse({ success: true } as any)).toBe(true);
    });

    it('should return false if parsed response is failed', () => {
      expect(adapter.validateResponse({ success: false } as any)).toBe(false);
    });
  });

  describe('verifyVoucherExists', () => {
    const context: ERPRequestContext = { companyId: 'comp-1', voucherId: 'v-1' };

    it('should return EXISTS if <VOUCHER> is found', async () => {
      mockXmlBuilder.buildExportXml.mockResolvedValue('<query/>');
      mockTransport.send.mockResolvedValue({ rawResponse: '<ENVELOPE><VOUCHER></VOUCHER></ENVELOPE>' });

      const result = await adapter.verifyVoucherExists({ voucherNumber: '123' }, context);
      
      expect(result).toBe('EXISTS');
      expect(mockXmlBuilder.buildExportXml).toHaveBeenCalledWith({ voucherNumber: '123' }, 'comp-1');
    });

    it('should return NOT_FOUND if "No entries" is found', async () => {
      mockXmlBuilder.buildExportXml.mockResolvedValue('<query/>');
      mockTransport.send.mockResolvedValue({ rawResponse: 'No entries found' });

      const result = await adapter.verifyVoucherExists({ voucherNumber: '123' }, context);
      
      expect(result).toBe('NOT_FOUND');
    });

    it('should return NOT_FOUND if response is empty DATA node', async () => {
      mockXmlBuilder.buildExportXml.mockResolvedValue('<query/>');
      mockTransport.send.mockResolvedValue({ rawResponse: '<ENVELOPE><DATA></DATA></ENVELOPE>' });

      const result = await adapter.verifyVoucherExists({ voucherNumber: '123' }, context);
      
      expect(result).toBe('NOT_FOUND');
    });

    it('should return UNKNOWN for unhandled XML', async () => {
      mockXmlBuilder.buildExportXml.mockResolvedValue('<query/>');
      mockTransport.send.mockResolvedValue({ rawResponse: '<ENVELOPE><OTHER/></ENVELOPE>' });

      const result = await adapter.verifyVoucherExists({ voucherNumber: '123' }, context);
      
      expect(result).toBe('UNKNOWN');
    });

    it('should return UNKNOWN on transport error', async () => {
      mockXmlBuilder.buildExportXml.mockResolvedValue('<query/>');
      mockTransport.send.mockRejectedValue(new Error('Connection timeout'));

      const result = await adapter.verifyVoucherExists({ voucherNumber: '123' }, context);
      
      expect(result).toBe('UNKNOWN');
    });
  });
});
