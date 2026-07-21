# Accounting Intelligence Subsystem

## Overview
The Accounting Intelligence module is the bridge between unstructured document comprehension and rigid ERP accounting rules. It begins exactly where `Document Intelligence` ends. Its sole input is a `BusinessDocument` entity, and its sole output is a `VoucherDraft`. 

**Strict Boundary:** This module NEVER communicates with Tally Prime directly. It prepares a localized draft for human review. Real-time ERP synchronization is exclusively the domain of the `Tally Sync Engine`.

## Core Accounting Pipeline

### 1. Vendor & Master Resolution
- **Inputs:** `VendorName`, `GSTIN` from `BusinessDocument`.
- **Outputs:** Mapped `Sundry Creditor` Ledger ID.
- **Validation:** Must exist in the mirrored Tally Master database.
- **Fallback:** If missing, a `Create Mapping Task` rule is triggered, placing the draft in `Needs Review`.

### 2. Voucher Type Determination
- **Purpose:** Decide if the document represents a Purchase, Journal, Payment, or Receipt voucher.
- **Outputs:** Enum `VoucherType` (e.g., `Purchase`, `Journal`).

### 3. Ledger & Cost Centre Recommendation
- **Purpose:** Map line items to Expense/Income ledgers and associate them with Student/Grade cost centres defined in `school-accounting-domain.md`.
- **Inputs:** Line item descriptions, historical mapping patterns.
- **Outputs:** Recommended Ledger IDs and Cost Centre IDs per row.
- **Confidence Scoring:** High confidence if exact historical match exists; low confidence if fallback LLM inference is used.

### 4. GST Ledger Mapping
- **Purpose:** Determine CGST, SGST, IGST input ledgers based on vendor and organizational state codes.
- **Validation:** Ensures tax percentages map exactly to standard Tally Tax ledgers.

### 5. Debit/Credit Determination & Math Validation
- **Purpose:** Construct double-entry bookkeeping transactions.
- **Validation:** Total Debits MUST exactly equal Total Credits. If `Balance != 0`, the pipeline throws a `Voucher Balance Mismatch` error.

### 6. Narration Generation
- **Outputs:** Auto-generated voucher narration summarizing the bill (e.g., "Being invoice #1234 for IT Maintenance via Vendor X").

### 7. Explainable AI & Scoring
- **Purpose:** Every ledger recommendation includes an `AI Explanation` string (e.g., "Ledger 'Repairs' chosen because vendor historically bills this ledger for 'Maintenance'"). 
- **Outputs:** An aggregate `AccountingConfidenceScore`. If below the threshold defined in `business-rules.md`, human intervention is mandatory.

## Output Handoff
The pipeline concludes by inserting a `VoucherDraft` record and updating the document state to `NEEDS_REVIEW`. The `Approval Workflow` subsystem assumes control at this point.
