# Review Queue Report

## Implementation
Created `GET /review/vendor` and `GET /review/student` by directly reusing the existing `InvoiceCandidate` and `StudentPaymentCandidate` data layers.

## Results
- Validated pagination metadata (total, limit, page limits).
- Returns the original confidence score, status, and mapped entities without duplicating the review capabilities.
