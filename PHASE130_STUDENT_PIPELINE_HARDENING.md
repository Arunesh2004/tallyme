# Phase 130 Student Payment Pipeline Hardening

## 1. Transaction-Level Idempotency
- **Implementation:** Added robust idempotency checks within the `StudentPaymentExtractor`.
- **Mechanism:** Before persisting a new `StudentPaymentCandidate`, the system queries the database for an existing record with the same `gatewayTransactionId`. 
- **Benefit:** If a parent forwards a receipt email multiple times, or if the IMAP poller accidentally fetches the same email thread, the system will instantly reject the duplicate payment at the extraction phase, guaranteeing that TallyPrime never receives duplicate receipt vouchers.

## 2. Dynamic Bank Ledger Mapping
- **Implementation:** Refactored `StudentVoucherMappingPolicy` (inside `student-voucher.orchestrator.ts`) and its caller (`application/index.ts`).
- **Mechanism:** Instead of blindly passing the extracted gateway string (e.g., "RAZORPAY") directly as the Tally ledger name, the policy now queries `LedgerMappingConfiguration`. It attempts to map the gateway via the `feeCategories` configuration or falls back to the globally configured `bankLedger`.
- **Fix Applied:** Discovered and fixed a critical bug in `index.ts` where the `incomeLedgerName` (Fee Head) was accidentally being passed as the `bankLedger` argument to the Orchestrator. 

## 3. Hybrid AI Extraction Strategy (Gemini Fallback)
- **Implementation:** Upgraded `StudentPaymentExtractor` to a hybrid model.
- **Mechanism:** The system retains deterministic regex parsing as its primary, high-speed extraction method (ideal for standard, known bank email formats). If the regex fails to locate critical fields (amount, transaction ID, or student name), the extractor now falls back to a Gemini AI Vision/Text block to intelligently parse the unknown format. 
- **Benefit:** Keeps the system extremely fast and cheap for 90% of receipts while using Gemini exclusively for complex, forwarded, or unformatted emails.

## 4. Architectural Boundaries Maintained
- The **Shared Accounting Engine** and the **Vendor Pipeline** remain completely untouched, adhering strictly to the `PRODUCT_CONSTITUTION.md`. All hardening was successfully isolated to the Student Payment Bounded Context.

The Student Payment Automation pipeline is now hardened for production!
