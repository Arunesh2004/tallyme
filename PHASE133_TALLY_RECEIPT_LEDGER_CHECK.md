# Phase 133 Tally Receipt Ledger Check

## 1. Required Tally Ledgers
Based on the `ReceiptStrategy` logic in the TallyMe backend, the following ledgers **MUST** exist in the connected TallyPrime company prior to initiating the UAT. If these are missing, TallyPrime will reject the XML payload.

### Bank/Gateway Ledgers
- **Razorpay Clearing A/c** (Type: Bank Accounts / Current Assets)
- **HDFC Bank UAT** (Type: Bank Accounts)
*(These must exactly match the `LedgerMappingConfiguration` seed).*

### Fee Income Ledgers
- **Tuition Fee** (Type: Direct Incomes / Indirect Incomes)
*(The Orchestrator will allocate the payment to a fee head. The exact string extracted or defaulted must exist).*

### Student Ledger
- **Sundry Debtors Default** (Type: Sundry Debtors)
*(This is currently hardcoded in the `AccountingTransaction` generator during matching as a fallback for the student credit line).*

## 2. Verification Steps in TallyPrime
1. Open the active Tally company (`Skyfall Legion Public School` or `TallyMe Demo Corp`).
2. Go to `Gateway of Tally` > `Alter` > `Ledger`.
3. Visually confirm the spelling of:
   - `Razorpay Clearing A/c`
   - `Sundry Debtors Default`
   - `Tuition Fee`
