# Phase C Architecture - Operational Visibility & Intelligence

## 1. System Overview
Phase C builds upon the shadow matching pipeline (Phase B) to provide complete operational visibility, analytics, and administrative control over the Vendor Master Management System (VMMS). The architecture is strictly read-only or administrative; it does not replace the legacy matcher or alter voucher generation logic.

## 2. Core Components

### A. Comparison Engine
- **Responsibility:** Periodically or synchronously analyzes dual-written records to identify discrepancies between the legacy pipeline (`InvoiceCandidate.vendorId`) and the VMMS output (`VendorMatchDecision`).
- **Execution:** Runs as an asynchronous background worker (`BatchComparisonWorker`) to avoid penalizing the ingestion path.
- **Output:** Categorizes matches into:
  - `MATCH`: Legacy and VMMS selected the identical final ERP ledger.
  - `MISMATCH`: Legacy and VMMS diverged.
  - `MANUAL_REVIEW`: VMMS failed to confidently determine a ledger, whereas legacy succeeded (or vice versa).
  - `UNKNOWN`: Insufficient data to compare (e.g., both failed).

### B. Metrics Model & Aggregator
- **Responsibility:** Aggregates real-time events emitted by `VmmsShadowExecutionService` into queryable time-series representations.
- **Data Points:** Total invoices processed, agreement/disagreement rates, stage resolutions (Stage 1 Exact vs Stage 2 Normalized), latency percentiles, and failure bounds.
- **Implementation:** Leverages a fast cache layer (e.g., Redis) or materialized views for high-performance dashboard reads, decoupled from the transactional Prisma store.

### C. Decision Replay Engine
- **Responsibility:** Allows administrators to execute newer versions of the `VmmsVendorMatcher` against historical invoices.
- **Mechanics:** 
  - Read-only pipeline fetching previous `InvoiceCandidate` raw OCR data.
  - Feeds data directly into the current matcher instance.
  - Generates a "What-If" `MatchEvidence` report without persisting to the transactional `VendorMatchDecision` table.
- **Safety Guarantee:** Completely stateless operation; guarantees no production voucher modification.

### D. Administrative Workflow Engine
- **Responsibility:** Captures human feedback on `MISMATCH` scenarios.
- **Capabilities:**
  - Mark VMMS as correct (promotes confidence in the model).
  - Create manual routing rules (`VendorAlias`) when both automated systems fail.
  - Audit trailing (who reviewed the mismatch, and why).

## 3. Database Impact
- **No New Tables Needed:** We will reuse existing infrastructure:
  - `VendorMatchDecision` acts as the source of truth for the VMMS result.
  - `VendorAudit` will store manual mismatch review decisions and approvals.
  - `VendorAlias` handles manual routing corrections.
- **Materialized Views (Optional):** We may leverage Prisma native raw queries to construct materialized views of the match rate if standard indexing proves insufficient for complex dashboard aggregates.

## 4. Observability Pipeline
- **Logs:** Continue using the structured Winston logger, elevating `MISMATCH` events to `WARN` level if agreement rate drops below the specified SLO.
- **Metrics:** Implement Prometheus/Grafana (or Datadog) metrics on the HTTP endpoints for the dashboard to track admin review throughput.
- **Alerts:** Generate alerts if dual-write failures exceed 1% or if average latency exceeds 50ms.

## 5. Security & Risks
- **Privacy:** Invoices may contain PII. The dashboard must strip non-essential PII fields (like sensitive line items) since the admin only requires GSTIN/Vendor Name to verify routing.
- **Storage Growth:** `MatchEvidence` JSONB strings will consume significant space. A retention policy (e.g., purge decisions older than 90 days that resulted in a `MATCH`) is highly recommended to control DB size.
- **Performance:** Complex join queries between `InvoiceCandidate`, `VendorBranch`, `VendorLedger`, and `VendorMatchDecision` for the dashboard could cause table locks. Read Replicas should be considered for the dashboard if traffic scales.
