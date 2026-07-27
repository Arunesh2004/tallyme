# Student Fee Allocation Engine Report

## Architecture
The `FeeAllocationService` bridges the gap between successfully matched `StudentPaymentCandidate` records and the `VoucherBuilderEngine` (which converts allocations into double-entry accounting).

## Responsibilities & Enforcement
- **Outstanding Fee Lookup**: Queries the `OutstandingFee` tables bound to the matched `studentId`.
- **Partial/Advance Payments**: Implements iterative depletion of outstanding dues. If the incoming payment exceeds outstanding dues, the remaining balance is shifted to a designated 'Student Advance' liability ledger.
- **Duplicate Protection (Critical Rule)**: The engine enforces a strict 1:1 uniqueness constraint between a `studentPaymentCandidateId` and a `FeeAllocationCandidate`. If a worker process fails and retries, it throws a `Duplicate Allocation Detected` error if the allocation was already bound. This satisfies the rule: "One payment transaction ID cannot create multiple allocations."

## Runtime Status
**Status:** VERIFIED. The allocation engine accurately transforms a raw payment amount into an accounting-ready payload for the Voucher Builder.
