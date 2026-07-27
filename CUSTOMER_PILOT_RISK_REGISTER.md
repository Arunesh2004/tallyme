# Customer Pilot Risk Register

**Scenario**: Deploying TallyMe Enterprise tomorrow to a real school customer.

---

## CRITICAL Risks — System is Broken

| Risk | Evidence | Impact |
|---|---|---|
| **Authentication does not work** | `auth.controller.ts` returns `STUB_ACCESS_TOKEN`. `authService.login()` is commented out. | No user can log in. No real JWT is issued. The entire system is unauthenticated. |
| **Manual review approvals are no-ops** | `ManualReviewController.approveReview()` returns `{id, status: 'APPROVED'}` without touching the database. | Every manual review approval silently fails. Documents stay stuck in MANUAL_REVIEW forever. |
| **Student payment extraction is hardcoded** | `PaymentExtractor.extract()` returns `amount = 15000` always. | Every student payment email will extract ₹15,000 regardless of actual amount. Wrong vouchers will be submitted to Tally. |
| **Company 'COMP-1' must be seeded** | Hardcoded in 8 locations, requires DB record with `id='COMP-1'`. | If the company record doesn't exist at deployment, all voucher creation fails with FK constraint violation. |
| **File upload not persisted to DB** | `files.controller.ts` line 53–54 is commented out. | Uploaded invoice files are stored on disk but cannot be retrieved, tracked, or linked to documents. |

---

## HIGH Risks — Major Functional Failure

| Risk | Evidence | Impact |
|---|---|---|
| **OcrController has no authentication guard** | No `@UseGuards` on `OcrController`. | Anyone can call `POST /ocr/process/:fileId` without credentials. |
| **ReviewController has no authentication guard** | No `@UseGuards` on `ReviewController`. | Anyone can approve or reject invoices without authenticating. |
| **Bank ledger mapping always returns 'Bank Account'** | `StudentVoucherMappingPolicy.getBankLedger()` hardcodes the return. | All student payments — regardless of payment gateway (Razorpay, NEFT, etc.) — debit a single 'Bank Account' ledger. Tally books will be incorrect. |
| **OCR document path is hardcoded as stub path** | `ocr.controller.ts` line 36: `` `/storage/invoices/stub/${fileId}` `` | The OCR pipeline reads from a non-existent stub path. OCR will fail on any real upload. |
| **OutboxWorker is completely stubbed** | `outbox.worker.ts`: `const events: any[] = []` | Transactional outbox provides no reliability. Events that depend on it are silently dropped. |
| **N+1 queries in batch state transitions** | 300+ queries per batch completion for large batches | Performance degradation under production batch load. |
| **Review queue has no pagination** | `findMany()` with no `take`/`skip` | Memory and timeout risks at scale. |

---

## MEDIUM Risks — Operational Degradation

| Risk | Evidence | Impact |
|---|---|---|
| **Document status endpoint always returns EXTRACTED** | `ocr.controller.ts` line 73 | Operators cannot monitor real document status. |
| **CSRF endpoint throws at runtime** | `csurf` not mounted but `req.csrfToken()` called | CSRF endpoint returns 500. |
| **Vendor confidence calculation stubbed** | `matching.service.ts`: `// 2. Calculate Confidence (stubbed)` | All vendor matches have incorrect confidence scores; routing decisions may be wrong. |
| **payloadSize hardcoded as 1024** | `process-erp-sync.use-case.ts` lines 174, 233 | Audit log sizes are always 1KB regardless of actual payload; makes performance debugging impossible. |
| **Advance payment ledger hardcoded as stub** | `advance-payment.policy.ts`: `'ADVANCE_FEE_LEDGER_STUB'` | Advance payment vouchers have incorrect ledger names in Tally. |

---

## LOW Risks — Manageable

| Risk | Evidence | Impact |
|---|---|---|
| **Max file upload size discrepancy** | Code: 10MB; documentation: 5MB | Customer may upload files up to 10MB when documentation says 5MB — not a blocker. |
| **No MFA** | Not implemented | Security exposure for admin accounts. |
| **No email notification on review assignment** | Not observed | Manual workflows require periodic dashboard checks. |

---

## Deployment Blocker Count
- **CRITICAL**: 5
- **HIGH**: 6
- **MEDIUM**: 5
- **LOW**: 3

**Verdict: NOT READY for customer pilot deployment.**
