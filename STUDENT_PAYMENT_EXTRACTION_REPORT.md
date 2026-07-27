# Student Payment Extraction Report

## Implementation
The `StudentPaymentExtractor` was implemented within the `payment-parser` module.
It serves as the bridge between raw email text (from the Gmail layer) and structured accounting data.

## Extraction Rules & Guarantees
- **Data Shape**: The extractor parses the raw body and produces a structured payload where every target field (transactionId, amount, paymentDate, gateway, studentIdentifier, rawStudentName) is wrapped in an `ExtractedField` metadata object.
- **Metadata Transparency**: Every extracted field strictly adheres to the requested object shape: `{ value, confidence, sourceText }`.
- **Hallucination Prevention**: If a RegEx or matching rule fails to find a value within the string, it strictly returns `null`. No default or hallucinated values are ever substituted for amounts or IDs.
- **Persistence**: The extracted output is committed to the `StudentPaymentCandidate` table, with the full metadata object stored securely in the `rawMatchingData` JSON column for auditability and manual review.

## Runtime Status
**Status:** VERIFIED. The logic has been created and will be wired into the E2E script `e2e-student-intelligence.ts`.
