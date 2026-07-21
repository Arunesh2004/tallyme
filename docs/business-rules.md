# Business Rules Engine

## Overview
This document centralizes the organizational policy and logic for TallyMe. Business rules act as interceptors between modules, determining flow control based on conditions. They must never be hardcoded across various services; instead, they are evaluated centrally by the Rule Engine during module transitions.

## 1. Document Rules
- **Rule:** `Duplicate Invoice`
  - **Condition:** S3 Hash match OR identical Vendor + Invoice Number.
  - **Action:** Block Processing.
  - **Severity:** High
  - **Message:** "This invoice has already been processed (Document ID: X)."
  - **Recovery:** User can force-override if marked as a valid duplicate/amendment.

- **Rule:** `Document Older Than Policy`
  - **Condition:** Invoice Date > 90 days (configurable).
  - **Action:** Review Required.
  - **Severity:** Medium
  - **Message:** "Invoice is older than organizational policy limits."

## 2. Vendor Rules
- **Rule:** `Vendor Missing`
  - **Condition:** Extraction yields no matching GSTIN or name in the `Vendors` table.
  - **Action:** Manual Review.
  - **Severity:** High
  - **Message:** "Unrecognized vendor. Please map or create a new vendor ledger."
  - **Recovery:** User clicks "Create Vendor Master", triggering a SyncJob to Tally.

- **Rule:** `Vendor Blacklisted`
  - **Condition:** Vendor mapped to a Tally ledger marked `Inactive` or `Blacklisted`.
  - **Action:** Block Processing.
  - **Severity:** Critical
  - **Message:** "Transactions with this vendor are currently prohibited."

## 3. GST Rules
- **Rule:** `GSTIN Invalid`
  - **Condition:** Format regex fails or Math Checksum fails against Subtotal.
  - **Action:** Validation Error.
  - **Severity:** High
  - **Message:** "Tax amounts do not mathematically align with the subtotal."
  - **Recovery:** Manual edit of line items in the Approval UI.

## 4. Accounting Rules
- **Rule:** `Voucher Balance Mismatch`
  - **Condition:** Sum(Debits) != Sum(Credits) in VoucherDraft.
  - **Action:** Reject Voucher Draft.
  - **Severity:** Critical
  - **Message:** "Double-entry balance mismatch detected."

- **Rule:** `Ledger Missing`
  - **Condition:** AI cannot confidently map an expense to a known Tally ledger.
  - **Action:** Create Mapping Task.
  - **Severity:** Medium
  - **Message:** "No historical mapping found. Please select an expense ledger."

## 5. Approval Rules
- **Rule:** `Confidence Below Threshold`
  - **Condition:** `AccountingConfidenceScore` < 90.
  - **Action:** Mandatory Human Review.
  - **Severity:** Info
  - **Message:** "AI confidence is low. Please verify ledger mappings."

- **Rule:** `Approval Required Above Configured Amount`
  - **Condition:** TotalAmount > ₹50,000.
  - **Action:** Escalation.
  - **Severity:** High
  - **Message:** "Voucher requires Senior Accountant approval."

## 6. Synchronization Rules
- **Rule:** `Tally Master Missing`
  - **Condition:** Sync Engine detects a referenced Ledger ID no longer exists in Tally.
  - **Action:** Queue Master Sync.
  - **Severity:** Medium
  - **Message:** "Ledger deleted in Tally. Resyncing master records."

- **Rule:** `Duplicate Voucher`
  - **Condition:** Tally rejects Sync payload due to identical Reference ID.
  - **Action:** Block Synchronization.
  - **Severity:** High
  - **Message:** "Voucher already exists in Tally Prime."
