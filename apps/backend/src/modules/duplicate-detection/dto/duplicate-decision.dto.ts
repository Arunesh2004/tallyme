import { DuplicateClassification, DuplicateRecommendedAction, InvoiceFingerprint } from '@prisma/client';

export interface DuplicateDecision {
  readonly classification: DuplicateClassification;
  readonly score: number;
  readonly recommendedAction: DuplicateRecommendedAction;
  readonly matchedFingerprintIds: readonly string[];
  readonly matchedFields: readonly string[];
  readonly confidenceBreakdown: Readonly<Record<string, number>>;
  readonly providerVersion: string;
  readonly algorithmVersion: string;
  readonly executionTimeMs: number;
  readonly providerMetadata?: Readonly<Record<string, any>>;
  readonly warnings?: readonly string[];
  readonly errors?: readonly string[];
  readonly providerName?: string;
  readonly policyVersion?: string;
  readonly fallbackUsed?: boolean;
  readonly cacheHit?: boolean;
  readonly decisionReason?: string;
}

export interface DuplicateEvaluationResult {
  readonly decision: DuplicateDecision;
  readonly fingerprint: Omit<InvoiceFingerprint, 'id' | 'createdAt' | 'updatedAt' | 'classification' | 'score' | 'recommendedAction' | 'decisionMetadata' | 'providerVersion'>;
}
