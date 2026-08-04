import { Injectable } from '@nestjs/common';
import { InvoiceFingerprint, DuplicateDetectionPolicy, DuplicateClassification, DuplicateRecommendedAction } from '@prisma/client';
import { DuplicateDetectionProvider, ProviderCapability } from '../interfaces/duplicate-detection-provider.interface';
import { DuplicateDecision } from '../dto/duplicate-decision.dto';

@Injectable()
export class RuleBasedProvider implements DuplicateDetectionProvider {
  version(): string {
    return '1.0.0';
  }

  capabilities(): ProviderCapability[] {
    return [ProviderCapability.EXACT];
  }

  async health(signal?: AbortSignal): Promise<boolean> {
    this.checkSignal(signal);
    return true; // Local rule engine is always healthy unless CPU bound
  }

  async evaluate(
    fingerprint: Readonly<InvoiceFingerprint>,
    candidates: ReadonlyArray<Readonly<InvoiceFingerprint>>,
    policy: Readonly<DuplicateDetectionPolicy>,
    signal: AbortSignal
  ): Promise<DuplicateDecision> {
    const startTime = Date.now();

    this.checkSignal(signal);

    const exactThreshold = policy.exactThreshold ?? 95;
    const likelyThreshold = policy.likelyThreshold ?? 80;
    const possibleThreshold = policy.possibleThreshold ?? 60;

    let highestScore = 0;
    let classification: DuplicateClassification = DuplicateClassification.NOT_DUPLICATE;
    let recommendedAction: DuplicateRecommendedAction = DuplicateRecommendedAction.ALLOW;
    const matchedFingerprintIds: string[] = [];
    let matchedFields: string[] = [];
    let bestMatch: Readonly<InvoiceFingerprint> | null = null;

    for (const candidate of candidates) {
      this.checkSignal(signal);

      // Simple exact match logic for now: same documentHash
      if (candidate.documentHash === fingerprint.documentHash) {
        highestScore = 100;
        classification = DuplicateClassification.EXACT_DUPLICATE;
        recommendedAction = DuplicateRecommendedAction.AUTO_BLOCK;
        matchedFingerprintIds.push(candidate.id);
        matchedFields = ['documentHash'];
        bestMatch = candidate;
        break; // Max score achieved
      }
      
      // In a real rule-based engine we would evaluate fuzzy weights from the policy
      // but for this Step 2 implementation, we stick to EXACT hashing as the primary determinism.
    }

    if (highestScore === 0 && candidates.length > 0) {
        // Fallback for demonstration: if no exact hash, but vendor and invoice number match
        const matchingVendorAndInvoice = candidates.find(c => 
            c.normalizedVendorName && fingerprint.normalizedVendorName &&
            c.normalizedVendorName === fingerprint.normalizedVendorName &&
            c.normalizedInvoiceNumber && fingerprint.normalizedInvoiceNumber &&
            c.normalizedInvoiceNumber === fingerprint.normalizedInvoiceNumber
        );

        if (matchingVendorAndInvoice) {
            highestScore = likelyThreshold;
            classification = DuplicateClassification.LIKELY_DUPLICATE;
            recommendedAction = DuplicateRecommendedAction.REQUIRE_CHECKER;
            matchedFingerprintIds.push(matchingVendorAndInvoice.id);
            matchedFields = ['normalizedVendorName', 'normalizedInvoiceNumber'];
            bestMatch = matchingVendorAndInvoice;
        }
    }

    return Object.freeze({
      classification,
      score: highestScore,
      recommendedAction,
      matchedFingerprintIds: Object.freeze(matchedFingerprintIds) as readonly string[],
      matchedFields: Object.freeze(matchedFields) as readonly string[],
      confidenceBreakdown: Object.freeze({
        primary: highestScore
      }),
      providerVersion: this.version(),
      algorithmVersion: fingerprint.algorithmVersion,
      executionTimeMs: Date.now() - startTime,
      providerName: 'RuleBasedProvider'
    });
  }

  private checkSignal(signal?: AbortSignal) {
    if (signal?.aborted) {
      const err = new Error('Provider evaluation aborted due to timeout or cancellation');
      err.name = 'AbortError';
      throw err;
    }
  }
}
