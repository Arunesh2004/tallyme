import { Test, TestingModule } from '@nestjs/testing';
import { ERPConnectorEngine } from './connector.engine';
import { ERPConnectionManager } from './connection.manager';
import { ERPPayloadBuilder } from './payload.builder';
import { ERPResponseParser } from './response.parser';
import { VoucherMapperService } from './voucher-mapper.service';
import { LoggerService } from '../../../core/logger/logger.service';

describe('ERPConnectorEngine', () => {
  let engine: ERPConnectorEngine;

  const mockAdapter = {
    sendVoucher: jest.fn(),
    verifyVoucherExists: jest.fn(),
  };

  const mockConnectionManager = {
    getConnectionAndAdapter: jest.fn(),
  };

  const mockMapper = {
    mapToTransport: jest.fn(),
  };

  const mockPayloadBuilder = {
    build: jest.fn(),
  };

  const mockResponseParser = {
    parseAndValidate: jest.fn(),
  };

  const mockLogger = { log: jest.fn(), debug: jest.fn(), error: jest.fn(), warn: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ERPConnectorEngine,
        { provide: ERPConnectionManager, useValue: mockConnectionManager },
        { provide: VoucherMapperService, useValue: mockMapper },
        { provide: ERPPayloadBuilder, useValue: mockPayloadBuilder },
        { provide: ERPResponseParser, useValue: mockResponseParser },
        { provide: LoggerService, useValue: mockLogger },
      ],
    }).compile();

    engine = module.get<ERPConnectorEngine>(ERPConnectorEngine);
  });

  it('should be defined', () => {
    expect(engine).toBeDefined();
  });

  describe('syncVoucher', () => {
    it('should orchestrate sync successfully', async () => {
      const mockContext: any = { voucherId: 'v-1', companyId: 'c-1', config: {} };
      
      mockConnectionManager.getConnectionAndAdapter.mockResolvedValue({ adapter: mockAdapter });
      mockMapper.mapToTransport.mockReturnValue({ voucherNumber: '123' });
      mockPayloadBuilder.build.mockResolvedValue('<payload/>');
      mockAdapter.sendVoucher.mockResolvedValue({ rawResponse: '<res/>', durationMs: 100 });
      mockResponseParser.parseAndValidate.mockReturnValue({
        parsed: { referenceId: 'ref-1' },
        isValid: true,
      });

      const result = await engine.syncVoucher({}, 'TALLY', mockContext);

      expect(mockConnectionManager.getConnectionAndAdapter).toHaveBeenCalledWith('TALLY');
      expect(mockMapper.mapToTransport).toHaveBeenCalled();
      expect(mockPayloadBuilder.build).toHaveBeenCalledWith(mockAdapter, { voucherNumber: '123' });
      expect(mockAdapter.sendVoucher).toHaveBeenCalledWith('<payload/>', mockContext);
      expect(mockResponseParser.parseAndValidate).toHaveBeenCalled();
      
      expect(result.success).toBe(true);
      expect(result.referenceId).toBe('ref-1');
      expect(result.requestXml).toBe('<payload/>');
    });

    it('should handle invalid response from parser', async () => {
      const mockContext: any = { voucherId: 'v-1', companyId: 'c-1', config: {} };
      
      mockConnectionManager.getConnectionAndAdapter.mockResolvedValue({ adapter: mockAdapter });
      mockMapper.mapToTransport.mockReturnValue({ voucherNumber: '123' });
      mockPayloadBuilder.build.mockResolvedValue('<payload/>');
      mockAdapter.sendVoucher.mockResolvedValue({ rawResponse: '<res/>', durationMs: 100 });
      mockResponseParser.parseAndValidate.mockReturnValue({
        parsed: { message: 'Invalid format' },
        isValid: false,
      });

      const result = await engine.syncVoucher({}, 'TALLY', mockContext);

      expect(result.success).toBe(false);
      expect(result.responseType).toBe('BUSINESS_ERROR');
      expect(result.message).toBe('Invalid format');
    });
  });

  describe('verifyVoucherExists', () => {
    it('should delegate to adapter if verifyVoucherExists is implemented', async () => {
      const mockContext: any = { companyId: 'c-1', voucherId: 'v-1', config: {} };
      mockConnectionManager.getConnectionAndAdapter.mockResolvedValue({ adapter: mockAdapter });
      mockAdapter.verifyVoucherExists.mockResolvedValue('EXISTS');

      const result = await engine.verifyVoucherExists({ voucherNumber: '123' }, 'TALLY', mockContext);

      expect(result).toBe('EXISTS');
      expect(mockAdapter.verifyVoucherExists).toHaveBeenCalledWith({ voucherNumber: '123' }, mockContext);
    });

    it('should return UNKNOWN if adapter does not implement verifyVoucherExists', async () => {
      const mockContext: any = { companyId: 'c-1', voucherId: 'v-1', config: {} };
      const adapterWithoutVerify = { sendVoucher: jest.fn() };
      mockConnectionManager.getConnectionAndAdapter.mockResolvedValue({ adapter: adapterWithoutVerify });

      const result = await engine.verifyVoucherExists({ voucherNumber: '123' }, 'TALLY', mockContext);

      expect(result).toBe('UNKNOWN');
    });
  });
});
