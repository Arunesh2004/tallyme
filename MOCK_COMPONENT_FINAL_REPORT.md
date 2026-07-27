# Mock Component Audit Report

## Objective
Identify all remaining hardcoded mocks, stubs, and test providers across the TallyMe Enterprise backend, classifying them for production replacement, configuration mapping, or retention (if strictly test-oriented).

## Audit Findings

### 1. `apps/backend/src/modules/vendor-slip/infrastructure/providers/fake-ocr.provider.ts`
- **Purpose**: Mocks Azure OCR output for uploaded Vendor Slips.
- **Usage**: Registered in `vendor-slip.module.ts`.
- **Replacement Strategy**: REPLACED by `src/modules/payment-parser/services/azure-ocr.service.ts` (Phase 2).
- **Status**: REQUIRES_CONFIGURATION

### 2. `apps/backend/src/modules/vendor-slip/infrastructure/providers/fake-extraction.provider.ts`
- **Purpose**: Returns hardcoded JSON for Vendor Invoice matching.
- **Usage**: Registered in `vendor-slip.module.ts`.
- **Replacement Strategy**: REPLACED by `src/modules/payment-parser/services/gemini-extraction.service.ts` (Phase 3).
- **Status**: REQUIRES_CONFIGURATION

### 3. `apps/backend/src/modules/student-fee/infrastructure/providers/fake-student-fee.providers.ts`
- **Purpose**: Mocks Gmail parsing, Razorpay extraction, student matching, and fee allocation.
- **Usage**: Registered internally for student E2E testing.
- **Replacement Strategy**: Partially REPLACED. Gmail Watch (Phase 4) and AI extraction (Phase 3) will provide real data. Outstanding fees and matching will require production DB hooks.
- **Status**: UNVERIFIED

### 4. `apps/backend/src/modules/mail/services/mail-storage.service.ts`
- **Purpose**: Fakes disk storage path (`fakePath`).
- **Usage**: Bypasses real S3/Local volume writes.
- **Replacement Strategy**: Retained as fallback; Production deployment will define standard disk mounts.
- **Status**: REQUIRES_CONFIGURATION

### 5. `apps/backend/src/modules/operations/controllers/`
- **Purpose**: Exposes mocked statuses for unverified capabilities (Gmail, OCR, AI).
- **Usage**: Dashboard statistics.
- **Replacement Strategy**: Retained explicitly. Mocks will naturally resolve when production config `.env` values populate.
- **Status**: UNVERIFIED

### 6. Test Specific Mocks (`erp-live-voucher.spec.ts`, `fake-vendor-automation.repository.ts`, etc.)
- **Purpose**: Pure unit testing isolation.
- **Usage**: `npm test` execution.
- **Replacement Strategy**: NONE. Test mocks do not conflict with production deployment.
- **Status**: VERIFIED

## Summary
The critical production boundaries affecting the main automation pipelines are **OCR**, **AI Extraction**, and **Gmail Parsing**. These have been targeted for architectural replacement in Phases 2, 3, and 4.
