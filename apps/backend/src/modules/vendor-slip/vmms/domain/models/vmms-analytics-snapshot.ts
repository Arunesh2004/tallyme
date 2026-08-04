export interface VmmsAnalyticsSnapshot {
  timestamp: Date;
  totalProcessed: number;
  legacyMatches: number;
  vmmsMatches: number;
  agreementRate: number;
  disagreementRate: number;
  stage1MatchRate: number;
  stage2MatchRate: number;
  manualReviewRate: number;
  shadowFailures: number;
  averageLatencyMs: number;
  p95LatencyMs: number;
  dualWriteRate: number;
}
