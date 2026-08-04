# ADR-001: Universal Document Ingestion Migration

## Status
Accepted

## Date
2026-08-03

## Context
TallyMe was originally built with a Purchase Invoice-centric architecture. Documents uploaded would immediately instantiate an `InvoiceCandidate` representing a vendor slip. As the system expanded to support Sales, Journals, Receipts, and other transaction types (Phase 13 `UniversalTransactionEngine`), the legacy ingestion layer remained rigidly typed for Purchase workflows, preventing multi-document automation.

## Problem Statement
The Universal Document Intelligence Pipeline needs to ingest and classify any document type, execute canonical extraction, and persist to `CanonicalTransactionDraft`. However, ripping out `InvoiceCandidate` immediately breaks critical working logic: vendor matching, legacy manual review, and operational reporting. 

## Considered Alternatives
1. **Big-Bang Rewrite:** Delete `InvoiceCandidate` and rewrite all consumers (workers, matching service, VMMS). Rejected due to unacceptable regression risk and downtime.
2. **Dual Upload Paths:** Expose a separate `/api/upload/universal` endpoint. Rejected because clients should not bear the burden of document routing; the system must intelligently classify.

## Decision
We will execute an **Enterprise Safe Migration** with the following components:
1. **Feature Flag (`USE_UNIVERSAL_INGESTION`)**: The migration will be fully gated by a feature flag. If OFF, the legacy pipeline executes.
2. **Document Classification**: AI and heuristic classification will sit upstream of extraction.
3. **Canonical Transaction Draft**: Will become the single immutable source of truth for extracted data.
4. **Purchase Compatibility Adapter**: For documents classified as `Purchase`, the universal draft will be mapped backward into an `InvoiceCandidate`. This isolates legacy consumers and preserves 100% backward compatibility.
5. **Dual Run**: While transitioning, Purchase documents will run both pipelines simultaneously to validate extraction parity.
6. **Migration Readiness Gate**: Rollout is strictly blocked unless all testing, leaks, and dual-run metrics pass.

## Consequences
- **Positive:** Zero downtime. Immediate rollback capability. Verifiable extraction parity via dual-run.
- **Negative:** Increased initial complexity due to the Compatibility Adapter. Small performance overhead running both pipelines for Purchase during validation.

## Retirement Strategy
`InvoiceCandidate` will remain until metrics prove 100% of legacy consumers have been successfully migrated to read from `TransactionDraft`. A future "Phase N" sprint will execute the final deletion.
