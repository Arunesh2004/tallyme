import { Test, TestingModule } from '@nestjs/testing';
import { ERPRetryService } from './retry.service';
import { ConfigService } from '@nestjs/config';

describe('ERPRetryService', () => {
  let service: ERPRetryService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ERPRetryService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ERPRetryService>(ERPRetryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('shouldRetry', () => {
    it('should return false for non-retryable transport codes', () => {
      const result = service.shouldRetry({ code: 'DUPLICATE_VOUCHER' });
      expect(result.shouldRetry).toBe(false);
      expect(result.reason).toContain('DUPLICATE_VOUCHER');
    });

    it('should return true for network timeouts', () => {
      const result = service.shouldRetry({ code: 'TIMEOUT' });
      expect(result.shouldRetry).toBe(true);
      expect(result.reason).toContain('TIMEOUT');
    });

    it('should return true for AbortError', () => {
      const result = service.shouldRetry({ name: 'AbortError' });
      expect(result.shouldRetry).toBe(true);
      expect(result.reason).toContain('AbortError');
    });

    it('should default to true for unknown errors', () => {
      const result = service.shouldRetry({ code: 'WEIRD_ERROR' });
      expect(result.shouldRetry).toBe(true);
      expect(result.reason).toContain('Unknown error');
    });
  });

  describe('shouldRetryResponseCode', () => {
    it('should return false for BUSINESS_ERROR', () => {
      const result = service.shouldRetryResponseCode('BUSINESS_ERROR');
      expect(result.shouldRetry).toBe(false);
      expect(result.reason).toContain('BUSINESS_ERROR');
    });

    it('should return false for MALFORMED_XML', () => {
      const result = service.shouldRetryResponseCode('MALFORMED_XML');
      expect(result.shouldRetry).toBe(false);
    });

    it('should return true for EMPTY_RESPONSE', () => {
      const result = service.shouldRetryResponseCode('EMPTY_RESPONSE');
      expect(result.shouldRetry).toBe(true);
      expect(result.reason).toContain('EMPTY_RESPONSE');
    });

    it('should return true for UNKNOWN', () => {
      const result = service.shouldRetryResponseCode('UNKNOWN');
      expect(result.shouldRetry).toBe(true);
    });
  });

  describe('isExhausted', () => {
    it('should return true if attempts >= maxAttempts', () => {
      expect(service.isExhausted(5, 5)).toBe(true);
      expect(service.isExhausted(6, 5)).toBe(true);
    });

    it('should return false if attempts < maxAttempts', () => {
      expect(service.isExhausted(4, 5)).toBe(false);
    });
  });

  describe('calculateBackoff', () => {
    it('should calculate exponential backoff', () => {
      expect(service.calculateBackoff(0)).toBe(1000);
      expect(service.calculateBackoff(1)).toBe(2000);
      expect(service.calculateBackoff(2)).toBe(4000);
    });

    it('should cap backoff at 5 minutes (300,000 ms)', () => {
      expect(service.calculateBackoff(10)).toBe(300000);
    });
  });

  describe('getMaxAttempts', () => {
    it('should return value from config if valid', () => {
      mockConfigService.get.mockReturnValue('10');
      expect(service.getMaxAttempts()).toBe(10);
    });

    it('should default to 5 if config is not set', () => {
      mockConfigService.get.mockReturnValue(undefined);
      expect(service.getMaxAttempts()).toBe(5);
    });

    it('should default to 5 if config is invalid string', () => {
      mockConfigService.get.mockReturnValue('invalid');
      expect(service.getMaxAttempts()).toBe(5);
    });
  });
});
