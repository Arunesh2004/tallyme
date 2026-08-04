import { Test, TestingModule } from '@nestjs/testing';
import { TallyTransportService } from './transport.service';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../../core/logger/logger.service';
import { ERPTransportException } from '../exceptions/erp-transport.exception';

describe('TallyTransportService', () => {
  let service: TallyTransportService;
  let configService: any;
  let loggerService: any;
  let mockFetch: jest.SpyInstance;

  beforeEach(async () => {
    configService = {
      get: jest.fn().mockImplementation((key) => {
        if (key === 'TALLY_HOST') return 'localhost';
        if (key === 'TALLY_PORT') return '9000';
        if (key === 'TALLY_HTTP_TIMEOUT_MS') return '5000';
        if (key === 'TALLY_DEBUG_PAYLOAD') return 'false';
        return null;
      }),
    };

    loggerService = {
      log: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TallyTransportService,
        { provide: ConfigService, useValue: configService },
        { provide: LoggerService, useValue: loggerService },
      ],
    }).compile();

    service = module.get<TallyTransportService>(TallyTransportService);
    
    // Mock global fetch
    mockFetch = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('send', () => {
    const context = { tenantId: 't1', correlationId: 'c1', voucherId: 'v1', jobId: 'j1', queueName: 'tally-sync', attemptNumber: 1 };

    it('should send payload successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('<response>OK</response>'),
      } as any);

      const result = await service.send('<request/>', context);

      expect(result.success).toBe(true);
      expect(result.httpStatus).toBe(200);
      expect(result.rawResponse).toBe('<response>OK</response>');
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:9000', expect.objectContaining({
        method: 'POST',
        body: '<request/>',
      }));
    });

    it('should handle HTTP errors gracefully (return as non-success transport result)', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue('Internal Server Error'),
      } as any);

      const result = await service.send('<request/>', context);

      expect(result.success).toBe(false);
      expect(result.httpStatus).toBe(500);
      expect(result.rawResponse).toBe('Internal Server Error');
    });

    it('should throw ERPTransportException on AbortError', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      await expect(service.send('<request/>', context)).rejects.toThrow(ERPTransportException);
      await expect(service.send('<request/>', context)).rejects.toThrow(/timed out/);
    });

    it('should throw ERPTransportException on network error', async () => {
      const networkError = new Error('ECONNREFUSED');
      (networkError as any).cause = { code: 'ECONNREFUSED' };
      mockFetch.mockRejectedValue(networkError);

      await expect(service.send('<request/>', context)).rejects.toThrow(ERPTransportException);
      await expect(service.send('<request/>', context)).rejects.toThrow(/ECONNREFUSED/);
    });

    it('should throw configuration error if timeout is invalid', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'TALLY_HTTP_TIMEOUT_MS') return 'invalid';
        return 'localhost';
      });

      await expect(service.send('<request/>', context)).rejects.toThrow(/Configuration error/);
    });
  });

  describe('checkHealth', () => {
    it('should return true if fetch is ok', async () => {
      mockFetch.mockResolvedValue({ ok: true } as any);
      const result = await service.checkHealth();
      expect(result).toBe(true);
    });

    it('should return false if fetch fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      const result = await service.checkHealth();
      expect(result).toBe(false);
    });
  });
});
