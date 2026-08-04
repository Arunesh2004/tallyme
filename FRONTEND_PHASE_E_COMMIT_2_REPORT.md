# Phase E Commit 2 Report: Frontend OCR Integration

## Overview
The frontend Vendor Review flow has been successfully migrated from the legacy MockOCRProvider mock pipeline to the production backend OCR endpoints.

## Files Modified
- `apps/web/app/(dashboard)/reviews/vendor/page.tsx`

## API Flow Implemented
1. **Upload**: `POST /files/upload` -> Returns `fileId`.
2. **Process**: `POST /ocr/process/:fileId` -> Returns `candidateId`.
3. **Poll Status**: `GET /ocr/:fileId/status` -> Loops until extraction/processing is completed.
4. **Hydrate Candidate Data**: `GET /ocr/:fileId/candidate` -> Returns the fully structured data.

## Hydration Mapping
- **Invoice Number**: Extracted from candidate payload.
- **Date**: Mapped from the candidate dates.
- **Total Amount**: Mapped from the candidate total.
- **Tax Amount**: Mapped from the candidate tax amount.
- **Confidence**: Mapped and dynamically renders "High Confidence" or "Validation Warning" based on threshold (80%).
- **Vendor Ledger**: Uses `mappedVendorId` if found, falls back to `extractedName` for manual mapping.
- **Expense Ledger**: Uses `mappedExpenseLedgerId` if found.
- **Line Items**: Array traversal from `extractedData.lineItems`.

## Polling Strategy
- Implemented a timed interval (2s) fetching `/ocr/:fileId/status`.
- Break polling on completion when `documentStatus` does not include `PROCESSING`.
- Fails securely on timeout (120s limit) or backend extraction failures.

## Next Steps
- Verify with physical real invoices.
- Legacy mock provider code remains intact pending manual audit as requested.
