# TallyMe Enterprise - Product Constitution

This document represents the permanent Product Constitution of TallyMe Enterprise. It supersedes all previous architecture discussions and must be strictly adhered to by all developers and AI agents.

## PRODUCT IDENTITY

TallyMe Enterprise is an Accounting Automation Platform.
It has EXACTLY TWO mandatory business features.
No future implementation may remove, replace, or bypass either feature.
All future development must preserve these workflows.

---

## CORE FEATURE 1 (MANDATORY): Vendor Slip Automation

**Purpose:**
Automatically convert vendor invoices into accounting vouchers inside Tally Prime.

**Canonical Workflow:**
Vendor Upload -> File Storage -> OCR -> AI Extraction -> InvoiceCandidate -> Vendor Matching -> Duplicate Detection -> Expense Validation -> Expense Allocation -> Manual Review (if required) -> VoucherCandidate -> Shared Accounting Engine -> Voucher Validation -> BullMQ Queue -> ERP Connector -> Tally XML Builder -> Tally Prime

*This workflow is mandatory.*

---

## CORE FEATURE 2 (MANDATORY): Student Fee Automation

**Purpose:**
Automatically process student fee payment confirmations and create accounting receipts in Tally Prime.

**Canonical Workflow:**
Student Payment -> Payment Gateway -> Confirmation Email -> Gmail Watch -> Pub/Sub -> History Sync -> Email Fetch -> Email Parsing -> Payment Extraction -> PaymentCandidate -> Student Matching -> Outstanding Fee Lookup -> Duplicate Detection -> Fee Allocation -> Advance Payment Policy -> Manual Review (if required) -> VoucherCandidate -> Shared Accounting Engine -> Voucher Validation -> BullMQ Queue -> ERP Connector -> Tally XML Builder -> Tally Prime

*This workflow is mandatory.*

---

## SHARED ACCOUNTING ENGINE

Both business workflows MUST converge into ONE shared accounting platform.

**Architecture:**
Vendor Workflow (VoucherCandidate) & Student Workflow (VoucherCandidate)
|
Shared Accounting Engine
|
Voucher Validation
|
BullMQ
|
ERP Connector
|
Tally XML Builder
|
Retry Policies
|
Observability
|
Tally Prime

Accounting logic must never be duplicated between workflows.
All accounting behavior belongs inside the Shared Accounting Engine.

---

## ARCHITECTURAL RULES

Future features must integrate into the existing architecture.
- Do NOT create separate accounting pipelines.
- Do NOT duplicate voucher generation.
- Do NOT duplicate ERP communication.
- Do NOT duplicate Tally XML generation.
- Do NOT duplicate retry logic.
- Do NOT duplicate validation logic.

Every accounting document must flow through the Shared Accounting Engine.

---

## FUTURE CHANGE POLICY

Before implementing any future change, first answer:
1. Does this affect Vendor Automation?
2. Does this affect Student Fee Automation?
3. Does this preserve the Shared Accounting Engine?
4. Does this duplicate existing accounting logic?
5. Does this violate the canonical architecture?

If any answer indicates architectural drift, stop and explain why before making changes.

---

## FINAL RULE

Treat the two core features and the Shared Accounting Engine as the permanent foundation of TallyMe Enterprise.
Every future enhancement must strengthen this architecture rather than replace or bypass it.
When reviewing pull requests, implementing new modules, or suggesting improvements, always verify compatibility with these mandatory workflows before proceeding.
