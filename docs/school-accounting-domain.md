# School Accounting Domain

## Overview
The TallyMe platform requires a specialized bounded context representing School Accounting paradigms. Standard enterprise invoicing does not adequately map to educational fee collections, grants, and academic sessions.

## Core Entities

### Academic Sessions
Financial years are strictly bounded by `AcademicSessions` (e.g., 2026-2027), dictating the ledger behavior for pre-collected fees.

### Fee Heads (Ledgers)
Specialized revenue streams:
- Tuition Fees
- Transport
- Hostel
- Library
- Extracurricular

### Students & Receivables
Students are modeled as individual **Cost Centres** or Sub-Ledgers under `Sundry Debtors`. Real-time reconciliation with Tally is required to reflect accurate outstanding dues.

### Vendor Payables
Standard `Sundry Creditors` optimized for educational procurement:
- Stationary and Textbooks
- IT Hardware
- Maintenance Services

### Payroll & Allowances
Staff accounting mapping to Tally Payroll features, handling deductions, EPF, and professional taxes.

## Accounting Workflows

### Academic Accounting Workflow
1. **Fee Generation:** Batch generation of Due vouchers linked to student cost centres.
2. **Receipt Tracking:** Parsing incoming bank statements to reconcile against student ledgers.
3. **Scholarships/Concessions:** Auto-generating Credit Notes for applicable students to offset Tuition Fee ledgers.

### Vendor Payment Lifecycle
1. Document Ingestion (Purchase Order / Bill).
2. AI Extraction & GST Validation.
3. Tally Sync Engine pushes `Purchase Voucher`.
4. Payment reconciliation via bank feed auto-generates `Payment Voucher` against the bill reference.

## Tally Prime Relationships
- **Tally Groups:** `Direct Incomes` (Fees), `Indirect Expenses` (Maintenance).
- **Cost Categories:** Classes / Grades.
- **Cost Centres:** Individual Students.
