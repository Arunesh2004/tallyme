export interface VendorMatchingConfig {
  autoResolveThreshold: number;
  manualReviewThreshold: number;
  signalWeights: {
    normalizedEquality: number;
    tokenOverlap: number;
    levenshtein: number;
    prefixSuffix: number;
  };
}

export const defaultVendorMatchingConfig: VendorMatchingConfig = {
  autoResolveThreshold: 0.95,
  manualReviewThreshold: 0.7,
  signalWeights: {
    normalizedEquality: 0.0,
    tokenOverlap: 0.4,
    levenshtein: 0.6,
    prefixSuffix: 0.0,
  },
};
