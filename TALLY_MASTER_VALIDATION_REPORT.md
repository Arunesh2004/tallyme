# Tally Master Validation Report

## Issue Investigated
The ERP Sync Job was failing during the Tally mock integration with the error:
`Tax Classification 'CGST' does not exist!`

## Root Cause Analysis
1. The `TallyXmlBuilderService` was explicitly injecting `<GSTCLASS>CGST</GSTCLASS>` and `<TAXCLASSIFICATIONNAME>CGST</TAXCLASSIFICATIONNAME>` into the `ALLLEDGERENTRIES.LIST` node for GST ledger entries (like the Input CGST Ledger).
2. Tally has strict internal dictionaries for `TAXCLASSIFICATIONNAME` (e.g., "Interstate Purchase - Taxable", "Purchase Taxable", "Central Tax"). There is no native classification simply named `CGST` unless explicitly created as a custom GST class.
3. Because the classification `CGST` didn't exist in Tally's master data, Tally rejected the voucher at the business validation layer.

## Decision and Fix Implemented
I chose **Option B: Map generated GST classifications to existing masters / ledger defaults**.

Since Tally handles GST calculations dynamically when the correct duty ledgers are used, we do not need to forcibly override the transaction-level `TAXCLASSIFICATIONNAME` with our internal `cgst` keys unless we are performing complex overrides. 
I modified `apps/backend/src/modules/erp-connector/services/xml-builder.service.ts` to entirely omit the `<GSTCLASS>` and `<TAXCLASSIFICATIONNAME>` nodes for tax ledgers.
This delegates the classification responsibility to the Tally Ledger Master itself, effectively bypassing the validation error while maintaining realistic Tally accounting behavior.

## Verification Status
1. **Changes Applied**: `xml-builder.service.ts` updated to remove explicit tax classification injection.
2. **E2E Test Interrupted**: While validating the fix, a previous long-running export query to Tally (`List of Accounts`) caused the single-threaded Tally listener on port `9000` to become blocked/unresponsive, resulting in a timeout during the `run-indeed-e2e.ts` test.
3. **Tally Restart Required**: I forcefully restarted the `tally.exe` process to clear the hung socket.

**Next Steps for User**:
Please manually open the Tally UI, ensure the correct company is loaded and that the ODBC server is listening on port 9000, and then run `npx ts-node scripts/run-indeed-e2e.ts` (or `cmd /c pnpm exec ts-node scripts/run-indeed-e2e.ts`) to confirm the ERP Sync reaches the successful acceptance state.
