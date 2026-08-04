# Phase 132 Student UAT Execution Plan

This document outlines the step-by-step real-world execution sequence for the final Student Payment Automation certification.

## Prerequisites Verification (Blocker Checklist)
- [ ] **BLOCKED:** Test Gmail inbox created and App Password generated.
- [ ] **BLOCKED:** `.env` updated with `GMAIL_ADDRESS` and `GMAIL_APP_PASSWORD`.
- [ ] **BLOCKED:** Database seeded with a test `Student` (Name: "John Doe", Admission: "ADM1001").
- [ ] **BLOCKED:** Database seeded with `LedgerMappingConfiguration` (Gateway -> Tally Bank Ledger).
- [ ] **BLOCKED:** TallyPrime running with active company containing required Ledgers.

## Execution Sequence

### Step 1: Payment Generation
- **Action:** A parent completes a fee payment, or we generate a realistic test payment confirmation email.
- **Data:** The email must contain `amount`, `transaction ID`, `date`, and `student name`.

### Step 2: Email Reception
- **Action:** The confirmation email arrives in the configured `GMAIL_ADDRESS` inbox.

### Step 3: Inbox Polling
- **Action:** The `GmailWatchService` (running every 60 seconds) detects the unread email.
- **Validation:** Logs confirm `Found 1 unread emails.`

### Step 4: Extraction & Idempotency
- **Action:** `StudentPaymentExtractor` parses the email via regex (or Gemini fallback).
- **Validation:** `amount`, `transaction ID`, `gateway`, and `student name` are extracted.
- **Validation:** Idempotency check passes (no prior receipt with this transaction ID).
- **State Change:** `StudentPaymentCandidate` created with status `EXTRACTED`.

### Step 5: Matching & Allocation
- **Action:** `StudentMatcher` matches the extracted name to the seeded `Student` record.
- **State Change:** Candidate status moves to `MATCHED`.
- **Action:** `FeeAllocationService` allocates the payment to outstanding fee heads.

### Step 6: Voucher Orchestration
- **Action:** `StudentVoucherOrchestrator` queues a `build-receipt-voucher` job.
- **Action:** `ReceiptStrategy` generates the Tally-compliant `Receipt` voucher XML, resolving the bank ledger dynamically.

### Step 7: ERP Synchronization (Final Certification)
- **Action:** The Shared Accounting Engine transmits the XML to TallyPrime (localhost:9000).
- **Validation:** Tally responds with `<CREATED>1</CREATED>`.
- **State Change:** Sync Job status moves to `SYNCED`.

---
**Do not commence UAT execution until all prerequisites in the Blocker Checklist are resolved.**
