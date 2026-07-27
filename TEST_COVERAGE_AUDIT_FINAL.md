# Test Coverage Audit — Final

**Method**: Inspect test files and cross-reference against what they actually test vs. what is stubbed.

---

## What IS Tested

### `allocation.engine.spec.ts` — HIGH QUALITY
✅ 7 scenarios covering full, partial, multi-instalment, overpayment, negative payment, already-paid, and priority-ordered allocation.
✅ Pure domain logic, no mocks needed.
✅ **This is the best-tested component in the codebase.**

### `duplicate-payment.rule.spec.ts`
✅ Tests the duplicate detection rule in isolation.

### `validation.spec.ts`
✅ Tests that `validateEnv()` throws on invalid environment variables.
✅ Correctly tests the unhappy path (no valid env = throw).

### ERP Live Tests (`erp-live-*.spec.ts`)
✅ Test the real `TallyTransportService`, `TallyXmlBuilderService`, and `TallyXmlParserService` in integration.
✅ Idempotency, retry, recovery, and voucher types are all exercised.
⚠️ All gracefully skip when Tally is unreachable — correct for infrastructure gaps, but means zero of these tests prove correctness in CI.

### `erp-connector.integration.spec.ts`
✅ Tests the full ERP flow against mocked transport — verifies state machine transitions.

---

## What is NOT Tested

🔴 **Authentication flow** — Zero tests for `AuthController` or `AuthService`. The stub token bug would never be caught by tests.

🔴 **Vendor Invoice Upload** — `OcrController.processInvoice()` has no tests. The hardcoded document path, the `COMP-1` company ID, and the Prisma call in the controller are all untested.

🔴 **Manual Review Approval** — `ManualReviewController.approveReview()` is a stub that returns a hardcoded response. No test verifies that approval actually changes database state.

🔴 **Student Payment Extraction** — `PaymentExtractor.extract()` hardcodes `amount = 15000`. No test verifies that it correctly parses real email content.

🔴 **Student Review Approval** — Same as manual review: stub, no test.

🔴 **File Upload** — `FilesController` has no tests. The database persistence is commented out.

🔴 **Vendor Matching** — `VendorMatcher.match()` has no unit tests visible. The confidence calculation is stubbed.

🔴 **Queue Workers** — `VendorSlipWorker`, `BatchSyncWorker` have no tests. Their behavior on bad input is unknown.

🔴 **End-to-end pipeline** — No test exists that exercises the full: upload → OCR → extract → match → voucher → queue → ERP path.

---

## Test Coverage Estimate

| Component | Coverage |
|---|---|
| `FeeAllocationEngine` | 🟢 High (~90%) |
| `DuplicatePaymentRule` | 🟢 High |
| `ERPConnectorEngine` + state machine | 🟢 High (integration) |
| `TallyXmlBuilderService` | 🟢 High (live tests) |
| `AuthController` / `AuthService` | 🔴 Zero |
| `OcrController` | 🔴 Zero |
| `ReviewController` | 🔴 Zero |
| `PaymentExtractor` | 🔴 Zero |
| `VendorMatcher` | 🔴 Zero |
| `FilesController` | 🔴 Zero |
| Queue Workers | 🔴 Zero |
| End-to-end pipeline | 🔴 Zero |

**Estimated Overall Business Logic Coverage: ~20%**
