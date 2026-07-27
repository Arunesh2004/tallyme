# STUDENT EXTRACTION REMEDIATION REPORT

**Date:** 2026-07-24  
**Phase:** 12 — Production Gap Closure  
**Audit Finding:** `PaymentExtractor.extract()` hardcoded `amount = 15000.0`. Every student payment email generated ₹15,000 regardless of actual content.

---

## Root Cause

Three locations contained hardcoded amounts:

### Location 1: `PaymentExtractor` (Primary — Domain Service)
```typescript
// src/modules/student-fee/domain/services/payment-extractor.service.ts
const amountVal = 15000.0; // Stub
```
This is the primary extraction path called during the Student Fee Automation workflow.

### Location 2: Infrastructure `EmailParser`  
```typescript
// src/modules/student-fee/infrastructure/index.ts
const amount = new PaymentAmount(new DecimalWrapper('15000.00'));
```

### Location 3: `RazorpayParser.extractFields()`
```typescript
// Mocked for the milestone framework implementation
return {
  transactionId: 'pay_ABC123XYZ',
  amount: 1500,
  ...
};
```
Mock data returned regardless of actual email content.

---

## Changes Made

### Files Modified

| File | Change |
|------|--------|
| `src/modules/student-fee/domain/services/payment-extractor.service.ts` | **Real regex extraction**: amount is required; extraction fails if not found |
| `src/modules/student-fee/infrastructure/index.ts` | **Real regex extraction**: returns null (manual review) if amount not extractable |
| `src/modules/payment-parser/parsers/razorpay.parser.ts` | **Real regex extraction**: extracts from email body; no hardcoded values |
| `src/modules/payment-parser/parsers/generic.parser.ts` | **Real regex extraction**: best-effort fallback for unrecognized gateways |

---

## Implementation Details

### Amount Extraction (PaymentExtractor — Domain Layer)

Amount is now a **required field**. If it cannot be extracted from the email body, the method returns `Result.fail()` which routes the email to manual review upstream:

```typescript
const amountVal = this.extractAmount(text);
if (amountVal === null) {
  return fail(`Could not extract payment amount from email. Routing to manual review.`);
}
```

Patterns supported:
```
/(?:INR|Rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)/i         → INR 15,000.00 | Rs. 15000 | ₹15000
/Amount(?:\s+(?:paid|received|of))?[:\s]+.../i        → Amount paid: 15000.00
/Total[:\s]+.../i                                       → Total: 15,000
/Payment(?:\s+of)?[:\s]+.../i                          → Payment of: 15000
```

### Transaction ID Extraction
Patterns supported:
```
/\b(pay_[a-zA-Z0-9]+|order_[a-zA-Z0-9]+)\b/          → Razorpay: pay_ABC123
/(?:Payment ID|Txn ID|Transaction ID)[:\s]+.../i        → Generic
/UTR[:\s]+(\d{12,22})/i                                → NEFT/IMPS UTR
```
If not found: generates `TXN-{random}` (not hardcoded; unpredictable).

### Provider Architecture

Production path uses configured AI/regex providers:
- `RazorpayParser` → `BasePaymentParser.parse()` → `FieldNormalizer` + `ConfidenceEngine`
- `GenericParser` → fallback for unknown gateways
- `GeminiExtractionService` — available when `GEMINI_API_KEY` is configured (routes to manual review if API key missing — correct behavior)

Development only uses `FakeInvoiceExtractionProvider` in `VendorSlipModule` for the OCR→AI path, gated by `process.env.NODE_ENV !== 'production'`.

---

## Verification

| Test | Expected | Mechanism |
|------|----------|-----------|
| Email with `INR 12,500` | Extracts `12500.0` | Regex pattern match |
| Email with `Rs. 8,750.50` | Extracts `8750.5` | Regex pattern match |
| Email with no amount text | `Result.fail()` | `extractAmount()` returns null → fail path |
| Razorpay email with `pay_XYZ` | `transactionId = 'pay_XYZ'` | Razorpay-specific regex |
| Generic email without transaction | Generates `TXN-{random}` | Fallback (not hardcoded) |

> **Note**: The `FakeInvoiceExtractionProvider` and `FakeOCRProvider` are correctly gated to non-production environments in `VendorSlipModule`. No fake provider is used in production. The `GeminiExtractionService` correctly degrades to manual review when `GEMINI_API_KEY` is not configured — this is correct production behavior for environments where AI extraction is not yet configured.
