# Phase 132 Tally Ledger Requirements

## 1. Bank Ledger Resolution
The `StudentVoucherMappingPolicy` dynamically resolves the Bank Ledger based on the Payment Gateway extracted from the email. 
It queries the `LedgerMappingConfiguration` table (`feeCategories` JSON field).

**Required Tally Configuration:**
If the UAT email originates from Razorpay, the Tally company MUST have a ledger created representing Razorpay (e.g., `Razorpay Clearing A/c`).

**Required Database Seeding:**
```sql
INSERT INTO "LedgerMappingConfiguration" ("id", "bankLedger", "feeCategories", "updatedAt")
VALUES ('uuid-config', 'HDFC Bank', '{"RAZORPAY": "Razorpay Clearing A/c", "PAYU": "PayU Clearing A/c"}', NOW());
```

## 2. Fee Income Ledger Resolution
The `FeeAllocationService` and `LedgerMappingEngine` resolve the specific income ledger (e.g., "Tuition Fee", "Transport Fee") for the student.
For `ReceiptStrategy` to succeed in Tally XML generation, the specific income ledger name resolved by the engine MUST exist in Tally as an Income/Direct Receipts ledger.

## 3. Student Ledger Resolution
The system generates a receipt associating the payment with a student ledger. According to the current Phase 129 audit and code, the system maps the student credit line either to the specific student name or a generic "Sundry Debtors Default" ledger depending on configuration.

## 4. Readiness Checklist
- **MISSING CONFIGURATION (Tally)**: Ensure `Razorpay Clearing A/c` and required fee income ledgers exist in the target Tally company.
- **MISSING CONFIGURATION (DB)**: Seed `LedgerMappingConfiguration`.
- **READY**: Code logic and Tally XML generation (`ReceiptStrategy`) are fully implemented and verified.
