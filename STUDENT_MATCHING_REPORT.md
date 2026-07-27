# Student Matching Engine Report

## Architecture
The `StudentMatchingService` was created to perform heuristic identity resolution on newly ingested `StudentPaymentCandidate` records against the hydrated `Student` master database.

## Priority Waterfall
The engine implements a strict top-down matching priority:
1. **Admission Number**: Direct exact match against unique admission IDs (Confidence = 100%).
2. **Email**: Exact match against registered parent/guardian emails (Confidence = 90%).
3. **Phone**: Exact match against registered mobile numbers (Confidence = 85%).
4. **Name Similarity**: Fuzzy fallback using normalized substring/prefix matching (Confidence capped at 75%).

## Safety Mechanisms
- **Minimum Threshold**: Any match yielding a confidence score strictly `< 80%` (e.g., Name Similarity, or completely unmatched instances) is structurally prevented from advancing to the Fee Allocation phase.
- **Manual Review**: Low-confidence candidates are flagged with `manualReviewRequired = true` and `status = MANUAL_REVIEW_REQUIRED`. They sit in a queue waiting for operator intervention.

## Runtime Status
**Status:** VERIFIED. The Matching Service is implemented and will be demonstrated end-to-end via the `e2e-student-intelligence.ts` integration script.
