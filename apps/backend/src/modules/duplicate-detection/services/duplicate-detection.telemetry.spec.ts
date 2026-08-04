import { Test, TestingModule } from '@nestjs/testing';
import { DuplicateDetectionTelemetry } from './duplicate-detection.telemetry';
import { getToken } from '@willsoto/nestjs-prometheus';
import { DuplicateClassification } from '@prisma/client';

describe('DuplicateDetectionTelemetry', () => {
  let telemetry: DuplicateDetectionTelemetry;
  let requestsTotal: any;
  let durationMs: any;
  let cacheHitTotal: any;
  let cacheMissTotal: any;
  let providerFailuresTotal: any;
  let timeoutsTotal: any;

  beforeEach(async () => {
    requestsTotal = { labels: jest.fn().mockReturnThis(), inc: jest.fn() };
    durationMs = { labels: jest.fn().mockReturnThis(), observe: jest.fn() };
    cacheHitTotal = { inc: jest.fn() };
    cacheMissTotal = { inc: jest.fn() };
    providerFailuresTotal = { labels: jest.fn().mockReturnThis(), inc: jest.fn() };
    timeoutsTotal = { labels: jest.fn().mockReturnThis(), inc: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DuplicateDetectionTelemetry,
        { provide: getToken('duplicate_detection_requests_total'), useValue: requestsTotal },
        { provide: getToken('duplicate_detection_duration_ms'), useValue: durationMs },
        { provide: getToken('duplicate_detection_cache_hit_total'), useValue: cacheHitTotal },
        { provide: getToken('duplicate_detection_cache_miss_total'), useValue: cacheMissTotal },
        { provide: getToken('duplicate_detection_provider_failures_total'), useValue: providerFailuresTotal },
        { provide: getToken('duplicate_detection_timeouts_total'), useValue: timeoutsTotal },
      ],
    }).compile();

    telemetry = module.get<DuplicateDetectionTelemetry>(DuplicateDetectionTelemetry);
  });

  it('should record request', () => {
    telemetry.recordRequest('redis', DuplicateClassification.EXACT_DUPLICATE, false, 150);
    expect(requestsTotal.labels).toHaveBeenCalledWith('redis', 'EXACT_DUPLICATE', 'false');
    expect(requestsTotal.inc).toHaveBeenCalled();
    expect(durationMs.labels).toHaveBeenCalledWith('redis', 'EXACT_DUPLICATE', 'false');
    expect(durationMs.observe).toHaveBeenCalledWith(150);
  });

  it('should handle recordRequest error gracefully', () => {
    requestsTotal.labels.mockImplementation(() => { throw new Error('Prometheus Error'); });
    expect(() => telemetry.recordRequest('redis', DuplicateClassification.NOT_DUPLICATE, false, 100)).not.toThrow();
  });

  it('should record cache hit', () => {
    telemetry.recordCacheHit();
    expect(cacheHitTotal.inc).toHaveBeenCalled();
  });

  it('should handle cache hit error gracefully', () => {
    cacheHitTotal.inc.mockImplementation(() => { throw new Error('Prometheus Error'); });
    expect(() => telemetry.recordCacheHit()).not.toThrow();
  });

  it('should record cache miss', () => {
    telemetry.recordCacheMiss();
    expect(cacheMissTotal.inc).toHaveBeenCalled();
  });

  it('should record provider failure', () => {
    telemetry.recordProviderFailure('redis');
    expect(providerFailuresTotal.labels).toHaveBeenCalledWith('redis');
    expect(providerFailuresTotal.inc).toHaveBeenCalled();
  });

  it('should record timeout', () => {
    telemetry.recordTimeout('redis');
    expect(timeoutsTotal.labels).toHaveBeenCalledWith('redis');
    expect(timeoutsTotal.inc).toHaveBeenCalled();
  });
});
