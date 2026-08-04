import { Test, TestingModule } from '@nestjs/testing';
import { TallyCircuitBreakerService } from './circuit-breaker.service';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../../core/logger/logger.service';

describe('TallyCircuitBreakerService', () => {
  let service: TallyCircuitBreakerService;
  let logger: any;

  beforeEach(async () => {
    jest.useFakeTimers();
    logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TallyCircuitBreakerService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'TALLY_CB_FAILURE_THRESHOLD') return '3';
              if (key === 'TALLY_CB_COOLDOWN_MS') return '100';
              if (key === 'TALLY_CB_SUCCESS_THRESHOLD') return '2';
              return undefined;
            }),
          },
        },
        { provide: LoggerService, useValue: logger },
      ],
    }).compile();

    service = module.get<TallyCircuitBreakerService>(TallyCircuitBreakerService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should start in CLOSED state', () => {
    expect(service.getState()).toBe('CLOSED');
    const decision = service.allowRequest();
    expect(decision.allowed).toBe(true);
    expect(decision.state).toBe('CLOSED');
  });

  it('should reset failure count on success in CLOSED state', () => {
    service.onFailure();
    service.onFailure();
    expect(service.getState()).toBe('CLOSED');
    service.onSuccess();
    // After success, counter should be reset
    service.onFailure();
    service.onFailure();
    expect(service.getState()).toBe('CLOSED'); // still not tripped
  });

  it('should OPEN after failure threshold is exceeded', () => {
    service.onFailure();
    service.onFailure();
    service.onFailure(); // 3 failures = threshold
    expect(service.getState()).toBe('OPEN');
  });

  it('should deny requests when OPEN and cooldown not elapsed', () => {
    service.onFailure();
    service.onFailure();
    service.onFailure();
    expect(service.getState()).toBe('OPEN');
    const decision = service.allowRequest();
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('Circuit OPEN');
  });

  it('should enter HALF_OPEN after cooldown elapses', () => {
    service.onFailure();
    service.onFailure();
    service.onFailure();
    expect(service.getState()).toBe('OPEN');

    // Wait for cooldown (100ms)
    jest.advanceTimersByTime(150);
    const decision = service.allowRequest();
    expect(decision.allowed).toBe(true);
    expect(decision.state).toBe('HALF_OPEN');
  });

  it('should close after enough successes in HALF_OPEN', () => {
    service.onFailure();
    service.onFailure();
    service.onFailure();
    jest.advanceTimersByTime(150);
    service.allowRequest(); // transition to HALF_OPEN

    service.onSuccess();
    expect(service.getState()).toBe('HALF_OPEN');
    service.onSuccess(); // 2 successes = successThreshold
    expect(service.getState()).toBe('CLOSED');
  });

  it('should re-OPEN if probe fails in HALF_OPEN', () => {
    service.onFailure();
    service.onFailure();
    service.onFailure();
    jest.advanceTimersByTime(150);
    service.allowRequest(); // transition to HALF_OPEN
    service.onFailure(); // probe fails
    expect(service.getState()).toBe('OPEN');
  });

  it('should ignore failures when already OPEN', () => {
    service.onFailure();
    service.onFailure();
    service.onFailure(); // OPEN
    service.onFailure(); // ignored
    service.onFailure(); // ignored
    expect(service.getState()).toBe('OPEN'); // still OPEN, no change
  });

  it('should return status object', () => {
    const status = service.getStatus();
    expect(status.state).toBe('CLOSED');
    expect(status.failureThreshold).toBe(3);
    expect(status.coolDownMs).toBe(100);
    expect(status.successThreshold).toBe(2);
    expect(status.lastOpenedAt).toBeNull();
  });
});
