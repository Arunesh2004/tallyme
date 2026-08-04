import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../../core/logger/logger.service';

/**
 * Circuit breaker states:
 *
 * CLOSED  → Normal operation — requests pass through.
 * OPEN    → Failure threshold exceeded — requests are rejected immediately,
 *            returning TALLY_UNAVAILABLE without burning retries.
 * HALF_OPEN → Cool-down elapsed — a probe request is allowed through.
 *             If it succeeds, → CLOSED. If it fails, → OPEN again.
 */
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerDecision {
  allowed: boolean;
  state: CircuitState;
  reason?: string;
}

@Injectable()
export class TallyCircuitBreakerService {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastOpenedAt: number | null = null;

  /** Number of consecutive failures before opening the circuit. */
  private readonly failureThreshold: number;
  /** Milliseconds to wait in OPEN state before entering HALF_OPEN. */
  private readonly coolDownMs: number;
  /** Number of consecutive successes in HALF_OPEN before closing. */
  private readonly successThreshold: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.failureThreshold = parseInt(
      configService.get<string>('TALLY_CB_FAILURE_THRESHOLD') || '5',
      10,
    );
    this.coolDownMs = parseInt(
      configService.get<string>('TALLY_CB_COOLDOWN_MS') || '60000',
      10,
    );
    this.successThreshold = parseInt(
      configService.get<string>('TALLY_CB_SUCCESS_THRESHOLD') || '2',
      10,
    );
  }

  /**
   * Call before every transport attempt.
   * Returns { allowed: false } when OPEN and cool-down has not elapsed.
   */
  allowRequest(): CircuitBreakerDecision {
    switch (this.state) {
      case 'CLOSED':
        return { allowed: true, state: 'CLOSED' };

      case 'OPEN': {
        const elapsed = Date.now() - (this.lastOpenedAt ?? 0);
        if (elapsed >= this.coolDownMs) {
          // Enter HALF_OPEN — allow one probe
          this.transitionTo('HALF_OPEN');
          return { allowed: true, state: 'HALF_OPEN' };
        }
        return {
          allowed: false,
          state: 'OPEN',
          reason: `Circuit OPEN — Tally unavailable. Cool-down remaining: ${Math.round((this.coolDownMs - elapsed) / 1000)}s`,
        };
      }

      case 'HALF_OPEN':
        // Allow the probe request through
        return { allowed: true, state: 'HALF_OPEN' };
    }
  }

  /**
   * Call when a transport attempt succeeds.
   */
  onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.reset();
      }
    } else if (this.state === 'CLOSED') {
      // Reset consecutive failure counter on any success
      this.failureCount = 0;
    }
  }

  /**
   * Call when a transport attempt fails (network error or timeout).
   * Do NOT call for Tally business errors (BUSINESS_ERROR) — those
   * are expected application errors, not infrastructure failures.
   */
  onFailure(): void {
    if (this.state === 'HALF_OPEN') {
      // Probe failed — re-open
      this.trip();
      return;
    }

    if (this.state === 'CLOSED') {
      this.failureCount++;
      if (this.failureCount >= this.failureThreshold) {
        this.trip();
      }
    }
    // If already OPEN, ignore additional failure notifications
  }

  /**
   * Returns current circuit state (for health endpoints and monitoring).
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Returns diagnostic info suitable for health APIs.
   */
  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastOpenedAt: this.lastOpenedAt
        ? new Date(this.lastOpenedAt).toISOString()
        : null,
      failureThreshold: this.failureThreshold,
      coolDownMs: this.coolDownMs,
      successThreshold: this.successThreshold,
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private trip(): void {
    this.transitionTo('OPEN');
    this.lastOpenedAt = Date.now();
    this.successCount = 0;
  }

  private reset(): void {
    this.transitionTo('CLOSED');
    this.failureCount = 0;
    this.successCount = 0;
    this.lastOpenedAt = null;
  }

  private transitionTo(newState: CircuitState): void {
    const previousState = this.state;
    this.state = newState;
    this.logger.log(
      {
        message: 'Circuit breaker state transition',
        previousState,
        newState,
        failureCount: this.failureCount,
        successCount: this.successCount,
      },
      'TallyCircuitBreakerService',
    );
  }
}
