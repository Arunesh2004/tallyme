# Phase 133 Final Readiness for Student UAT

## READY STATUS (Green)
- [x] **Code Components:** The `StudentPaymentExtractor`, `StudentMatcher`, and `FeeAllocationService` are fully implemented.
- [x] **Accounting Engine:** The `StudentVoucherOrchestrator` seamlessly integrates with the Shared Accounting Engine.
- [x] **Tally Connector:** The `ReceiptStrategy` and ERP XML generation are fully functional.
- [x] **Pipeline Hardening:** Idempotency checks and dynamic ledger mappings are in place.

## BLOCKED STATUS (Red)
Do not start UAT until the following manual tasks are completed by the administrator:

- [ ] **Missing Credentials:** 
  - Provide `GMAIL_ADDRESS` and `GMAIL_APP_PASSWORD` in `.env`.
- [ ] **Missing Master Data:** 
  - Execute `npx ts-node seed-uat-student.ts` (detailed in `PHASE133_STUDENT_MASTER_SETUP.md`) to create the test student and mapping configuration.
- [ ] **Missing Ledger Configuration (Tally):** 
  - Ensure the TallyPrime company contains `Razorpay Clearing A/c`, `Sundry Debtors Default`, and `Tuition Fee`.

## Final Dry Run Sequence
Once the blockers are resolved, the UAT execution sequence is:
1. Start TallyPrime XML Server on port 9000.
2. Start the TallyMe backend worker.
3. Send the formatted test email from `PHASE133_PAYMENT_EMAIL_UAT_PLAN.md` to the test inbox.
4. Observe the worker logs as it fetches the email, extracts the data, matches the student, and generates the voucher.
5. Verify `<CREATED>1</CREATED>` in the Tally Sync logs.
6. Verify the Receipt Voucher appears in TallyPrime.
