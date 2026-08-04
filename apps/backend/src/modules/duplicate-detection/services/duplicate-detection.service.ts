import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InvoiceFingerprint, DuplicateDetectionPolicy, DuplicateClassification, DuplicateRecommendedAction } from '@prisma/client';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { DuplicateDetectionProvider } from '../interfaces/duplicate-detection-provider.interface';
import { FingerprintRepository } from '../interfaces/fingerprint-repository.interface';
import { DuplicateDecision, DuplicateEvaluationResult } from '../dto/duplicate-decision.dto';
import { DuplicateDetectionRequest } from '../dto/duplicate-detection-request.dto';
import { DUPLICATE_DETECTION_PROVIDER, FINGERPRINT_REPOSITORY } from '../duplicate-detection.tokens';
import { DuplicateDetectionTelemetry } from './duplicate-detection.telemetry';
import { FingerprintFactory } from '../factories/fingerprint.factory';
import { DuplicateDetectedException, DuplicatePolicyException, DuplicateEngineUnavailableException } from '../exceptions/duplicate-detection.exceptions';

@Injectable()
export class DuplicateDetectionService {
  private readonly logger = new Logger(DuplicateDetectionService.name);

  constructor(
    @Inject(DUPLICATE_DETECTION_PROVIDER) private readonly provider: DuplicateDetectionProvider,
    @Inject(FINGERPRINT_REPOSITORY) private readonly repository: FingerprintRepository,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService, // For fetching policy from DB if cache misses
    private readonly telemetry: DuplicateDetectionTelemetry,
    private readonly fingerprintFactory: FingerprintFactory
  ) {}

  async evaluate(request: DuplicateDetectionRequest): Promise<DuplicateEvaluationResult> {
    const isEnabled = this.configService.get<boolean>('ENABLE_DUPLICATE_DETECTION', true);
    
    const fingerprintPayload = this.fingerprintFactory.generate(request);
    
    if (!isEnabled) {
      this.logger.log(`Duplicate detection disabled via feature flag. Tenant: ${request.tenantId}`);
      return {
        decision: this.createNotDuplicateDecision(fingerprintPayload, 'Disabled via feature flag', true),
        fingerprint: fingerprintPayload
      };
    }

    try {
      const policy = await this.resolvePolicy(request.tenantId);
      
      const candidates = await this.repository.findCandidates(request.tenantId, {
        vendorId: fingerprintPayload.vendorId ?? undefined,
        normalizedVendorName: fingerprintPayload.normalizedVendorName ?? undefined
      });

      // We pass the raw generated fingerprint object to executeWithTimeout
      // The provider interface expects InvoiceFingerprint, so we cast it as such
      const decision = await this.executeWithTimeout(fingerprintPayload as InvoiceFingerprint, candidates, policy);
      
      this.telemetry.recordRequest(
        decision.providerName ?? 'unknown',
        decision.classification,
        decision.fallbackUsed ?? false,
        decision.executionTimeMs
      );

      return {
        decision,
        fingerprint: fingerprintPayload
      };
    } catch (error) {
      this.logger.error(`Duplicate detection failed: ${(error as Error).message}`, (error as Error).stack);
      
      const strictMode = this.configService.get<boolean>('DUPLICATE_DETECTION_STRICT_MODE', true);
      if (strictMode) {
        throw new DuplicateEngineUnavailableException(`Evaluation failed: ${(error as Error).message}`);
      }

      const fallbackDecision = this.createNotDuplicateDecision(fingerprintPayload, `Fallback applied due to error: ${(error as Error).message}`, true);
      this.telemetry.recordRequest('fallback', fallbackDecision.classification, true, 0);
      return {
        decision: fallbackDecision,
        fingerprint: fingerprintPayload
      };
    }
  }

  async persistFingerprint(
    fingerprint: Omit<InvoiceFingerprint, 'id' | 'createdAt' | 'updatedAt' | 'classification' | 'score' | 'recommendedAction' | 'decisionMetadata' | 'providerVersion'>,
    decision: DuplicateDecision,
    tx?: any
  ): Promise<InvoiceFingerprint> {
    const completeFingerprint = {
      ...fingerprint,
      classification: decision.classification,
      score: decision.score,
      recommendedAction: decision.recommendedAction,
      decisionMetadata: {
        matchedFingerprintIds: decision.matchedFingerprintIds,
        matchedFields: decision.matchedFields,
        confidenceBreakdown: decision.confidenceBreakdown,
        decisionReason: decision.decisionReason
      } as any,
      providerVersion: decision.providerVersion
    };

    return await this.repository.create(completeFingerprint, tx);
  }

  private async executeWithTimeout(
    fingerprint: Readonly<InvoiceFingerprint>,
    candidates: ReadonlyArray<Readonly<InvoiceFingerprint>>,
    policy: Readonly<DuplicateDetectionPolicy>
  ): Promise<DuplicateDecision> {
    const timeoutMs = this.configService.get<number>('DUPLICATE_DETECTION_TIMEOUT_MS', 1000);
    const controller = new AbortController();
    
    const timeout = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const decision = await this.provider.evaluate(fingerprint, candidates, policy, controller.signal);
      
      return Object.freeze({
        ...decision,
        policyVersion: policy.id,
        fallbackUsed: false,
        cacheHit: false 
      });
    } catch (error) {
      if (controller.signal.aborted) {
        this.telemetry.recordTimeout(this.provider.constructor.name);
        throw new DuplicateEngineUnavailableException(`Provider exceeded timeout of ${timeoutMs}ms`);
      }
      this.telemetry.recordProviderFailure(this.provider.constructor.name);
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async resolvePolicy(tenantId: string): Promise<Readonly<DuplicateDetectionPolicy>> {
    const cacheKey = `duplicate_policy:${tenantId}`;
    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        this.telemetry.recordCacheHit();
        return Object.freeze(JSON.parse(cached)) as Readonly<DuplicateDetectionPolicy>;
      }
    } catch (err) {
      this.logger.warn(`Redis cache unavailable for policy resolution: ${(err as Error).message}`);
    }

    this.telemetry.recordCacheMiss();

    const dbPolicy = await this.prisma.duplicateDetectionPolicy.findFirst({
      where: { tenantId }
    });

    if (!dbPolicy) {
      // Fallback to system default if no tenant policy exists
      return Object.freeze({
        id: 'system-default',
        tenantId: null,
        companyId: null,
        exactThreshold: 95.0,
        likelyThreshold: 80.0,
        possibleThreshold: 60.0,
        weights: {},
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    try {
      await this.redisService.set(cacheKey, JSON.stringify(dbPolicy), 300); // 5 minute TTL
    } catch (err) {
      this.logger.warn(`Failed to set Redis cache for policy: ${(err as Error).message}`);
    }

    return Object.freeze(dbPolicy) as Readonly<DuplicateDetectionPolicy>;
  }

  private createNotDuplicateDecision(
    fingerprint: Partial<InvoiceFingerprint>, 
    reason: string, 
    fallback: boolean
  ): DuplicateDecision {
    return Object.freeze({
      classification: DuplicateClassification.NOT_DUPLICATE,
      score: 0,
      recommendedAction: DuplicateRecommendedAction.ALLOW,
      matchedFingerprintIds: Object.freeze([]) as readonly string[],
      matchedFields: Object.freeze([]) as readonly string[],
      confidenceBreakdown: Object.freeze({}),
      providerVersion: 'fallback',
      algorithmVersion: fingerprint.algorithmVersion || '1.0',
      executionTimeMs: 0,
      decisionReason: reason,
      fallbackUsed: fallback
    });
  }
}
