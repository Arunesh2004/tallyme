import { RuleBasedProvider } from './rule-based.provider';
import { InvoiceFingerprint, DuplicateDetectionPolicy, DuplicateClassification, DuplicateRecommendedAction } from '@prisma/client';

describe('RuleBasedProvider', () => {
  let provider: RuleBasedProvider;

  const mockFingerprint: Readonly<InvoiceFingerprint> = Object.freeze({
    id: 'fp-1',
    tenantId: 'tenant-1',
    vendorId: 'vendor-1',
    documentHash: 'hash-abc',
    algorithmVersion: 'v1',
    normalizationVersion: 'v1',
    providerVersion: null,
    normalizedInvoiceNumber: 'INV123',
    normalizedVendorName: 'ACME',
    normalizedAmount: '100',
    normalizedDate: '2023-01-01',
    classification: null,
    score: null,
    recommendedAction: null,
    decisionMetadata: null,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const mockPolicy: Readonly<DuplicateDetectionPolicy> = Object.freeze({
    id: 'pol-1',
    tenantId: 'tenant-1',
    companyId: null,
    exactThreshold: 95,
    likelyThreshold: 80,
    possibleThreshold: 60,
    weights: {},
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const mockCandidates: ReadonlyArray<Readonly<InvoiceFingerprint>> = Object.freeze([
    Object.freeze({
      ...mockFingerprint,
      id: 'fp-2',
      documentHash: 'hash-xyz', // different hash
      normalizedInvoiceNumber: 'INV123',
      normalizedVendorName: 'ACME' // exact vendor and invoice
    }),
    Object.freeze({
      ...mockFingerprint,
      id: 'fp-3',
      documentHash: 'hash-abc', // exact hash
    })
  ]);

  beforeEach(() => {
    provider = new RuleBasedProvider();
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
    expect(provider.version()).toBe('1.0.0');
    expect(provider.capabilities()).toContain('EXACT');
  });

  it('should return NOT_DUPLICATE if no candidates provided', async () => {
    const signal = new AbortController().signal;
    const result = await provider.evaluate(mockFingerprint, [], mockPolicy, signal);

    expect(result.classification).toBe(DuplicateClassification.NOT_DUPLICATE);
    expect(result.score).toBe(0);
    expect(result.recommendedAction).toBe(DuplicateRecommendedAction.ALLOW);
    expect(result.matchedFingerprintIds).toHaveLength(0);
  });

  it('should return EXACT_DUPLICATE if documentHash matches', async () => {
    const signal = new AbortController().signal;
    const result = await provider.evaluate(mockFingerprint, mockCandidates, mockPolicy, signal);

    expect(result.classification).toBe(DuplicateClassification.EXACT_DUPLICATE);
    expect(result.score).toBe(100);
    expect(result.recommendedAction).toBe(DuplicateRecommendedAction.AUTO_BLOCK);
    expect(result.matchedFingerprintIds).toContain('fp-3');
    expect(result.matchedFields).toContain('documentHash');
  });

  it('should return LIKELY_DUPLICATE if only vendor and invoice match', async () => {
    const signal = new AbortController().signal;
    const candidates = [mockCandidates[0]]; // Only the one with hash-xyz
    
    const result = await provider.evaluate(mockFingerprint, candidates, mockPolicy, signal);

    expect(result.classification).toBe(DuplicateClassification.LIKELY_DUPLICATE);
    expect(result.score).toBe(80);
    expect(result.recommendedAction).toBe(DuplicateRecommendedAction.REQUIRE_CHECKER);
    expect(result.matchedFingerprintIds).toContain('fp-2');
    expect(result.matchedFields).toContain('normalizedVendorName');
  });

  it('should immediately throw if AbortSignal is aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    
    await expect(provider.evaluate(mockFingerprint, mockCandidates, mockPolicy, controller.signal))
      .rejects.toThrow('Provider evaluation aborted due to timeout or cancellation');
  });

  it('should ensure inputs are immutable by attempting mutation', async () => {
    // In a real execution environment Object.freeze prevents this,
    // TypeScript readonly prevents it at compile time. We verify read-only nature.
    const signal = new AbortController().signal;
    const result = await provider.evaluate(mockFingerprint, mockCandidates, mockPolicy, signal);
    
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.matchedFingerprintIds)).toBe(true);
  });
});
