# Phase 129 Student Payment Automation Architecture Audit

## Executive Summary
An architectural audit of the Student Payment Automation pipeline (Gmail → Payment Extraction → TallyPrime Receipt) was performed. The pipeline successfully converges into the Shared Accounting Engine as mandated by the project constitution, ensuring no duplication of Tally XML generation or retry logic. 

However, several upstream components are currently using stubs, regex fallbacks, or lack robust safeguards (such as duplicate payment prevention).

---

## 1. Gmail Connector & Email Polling Worker
### Current Implementation
- **IMAP Polling:** A functional `GmailWatchService` exists that uses standard IMAP to poll for unread emails every 60 seconds (`setInterval`). It marks emails as read after passing them to the downstream `MailProcessingService`.
- **Webhook Push (Pub/Sub):** The `gmail.connector.ts` contains stubbed methods (`registerWatch`, `fetchHistory`, `getMessage`) and returns dummy data. 

### Audit Result
- **Status:** Partially Implemented.
- **Action Required:** While IMAP polling works, for real-time reliable webhook delivery, the Google Pub/Sub OAuth logic in `gmail.connector.ts` needs full implementation.

---

## 2. Payment Extraction Logic
### Current Implementation
- The `StudentPaymentExtractor` (`student-payment.extractor.ts`) currently uses basic regex patterns to extract amounts (`(?:INR|Rs\.?)\s*([\d,]+\.?\d*)`), transaction IDs, gateways, and admission numbers from the email body.
- Confidence scores are hardcoded (e.g., `confidence: 0.95`).

### Audit Result
- **Status:** Mock/Stub implementation.
- **Action Required:** Needs **Gemini AI Integration**. The regex approach is too brittle for unstructured bank emails and forward chains. A Gemini Vision/Text prompt must replace the regex logic to intelligently extract payment parameters and normalize names.

---

## 3. Student Ledger Mapping
### Current Implementation
- `StudentVoucherMappingPolicy` simply returns the `paymentMethod` string directly as the bank ledger name.
- `ReceiptStrategy` uses the `LedgerResolver` to fetch credit ledgers based on `feeHeadName`.

### Audit Result
- **Status:** Basic Implementation.
- **Action Required:** The bank ledger mapping needs to dynamically map payment gateways (e.g., "Razorpay", "PayU") to their specific Tally ledger names (e.g., "Razorpay Clearing Account") instead of assuming the gateway name is the ledger name.

---

## 4. Receipt Voucher Generation & TallyPrime Sync
### Current Implementation
- `StudentVoucherOrchestrator` successfully formats the allocation and payment data and dispatches a `build-receipt-voucher` job to the `VOUCHER_BUILDER_QUEUE`.
- `ReceiptStrategy` processes the payload, creates the bank DEBIT line, fee head CREDIT lines, and automatically handles overpayments via an ADVANCE CREDIT line.
- The pipeline seamlessly utilizes the **Shared Accounting Engine** and the existing TallyPrime XML ERP Sync adapter.

### Audit Result
- **Status:** Fully Implemented.
- **Action Required:** None. This flawlessly adheres to the `PRODUCT_CONSTITUTION.md` mandate.

---

## 5. Duplicate Payment Prevention
### Current Implementation
- The `StudentPaymentCandidate` schema enforces a `@unique` constraint on `documentId`. This correctly prevents the exact same *email* from being processed twice.
- However, `gatewayTransactionId`, `utr`, and `bankReference` do not have unique constraints. 

### Audit Result
- **Status:** Missing Business Logic Protection.
- **Action Required:** If a parent forwards a receipt email twice (creating two different `documentId`s but containing the same Transaction ID), the system will process both and create duplicate receipts in Tally. Idempotency checks must be added at the `transactionId` / `utr` level in the database or extraction pipeline.
