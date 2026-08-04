# Phase D Commit 1 Fix Report

## Root Cause
The refactoring of `VendorSlipWorker.process()` introduced a scoping regression. In Commit 1, the execution flow was forked into an Active Enforcement branch and a Legacy fallback branch using an `if/else` block. The `mapping` variable was initialized using a `const` declaration inside the `else` block (the legacy path). Later in the function, outside of the conditional blocks, the legacy allocator attempted to consume `mapping`, which fell out of lexical scope, leading to a fatal runtime `ReferenceError` when the fallback was executed. This was improperly masked from the TypeScript compiler by a `// @ts-ignore` directive.

## Exact Code Change
- Moved the declaration of `mapping` (as `let mapping: any;`) outside and above the `if/else` conditional block, aligning its lexical scope with the rest of the shared variables used for final voucher construction.
- Removed the `const` keyword from the assignment within the legacy fallback `else` block: `mapping = await this.ledgerMapper.map(match);`
- Deleted the `// @ts-ignore` directive above the allocator call.

## Why the runtime ReferenceError is impossible after the fix
By hoisting `let mapping: any;` to the outer function scope before the conditional blocks, the variable exists in the lexical environment of both the legacy assignment step and the legacy consumption step. The TypeScript compiler now properly validates the reference without `// @ts-ignore`, verifying that the memory reference is statically sound.

## Proof the legacy path is restored
When `VMMS_ACTIVE_ENFORCEMENT_ENABLED=false`, the logic proceeds into the `else` branch, queries the legacy Matcher, runs the legacy LedgerMapper (assigning to the outer `mapping` variable), and performs legacy Validation. All variables mutated within this block persist exactly as they did in Phase B, allowing the allocator to construct the exact same Shared Accounting payload byte-for-byte.

## Test Results
- `npx prisma validate`: Passed (Schema valid).
- `npx tsc --noEmit`: Passed (0 errors).
- `npm run test apps/backend/src/modules/vendor-slip/queue`: Passed.
- `npm run test apps/backend/src/modules/vendor-slip/vmms`: Passed.

## Validation Results
All 15 requirements specified in the strict Principal Engineer contract audit have been re-verified. The legacy fallback path has been completely restored without modifying any Phase D active enforcement semantics. No new regressions were introduced.
