# Phase C Commit 3 Alignment Report

## 1. Contract Mismatches Corrected
1. Removed `ReplayOutcome` enum entirely as it was not defined in the frozen architecture.
2. Renamed `invoiceId` to `invoiceCandidateId` to match the contract.
3. Renamed `historicalDecision` to `originalDecision` to match the contract.
4. Corrected `simulatedDecision` and `originalDecision` shape to `{ stage, vendorLedgerId, confidence }`.
5. Renamed `outcome` to `diffStatus`.
6. Removed `explanation` field.
7. Removed `evidence` field.
8. Removed `replayTimestamp` field.
9. Removed `algorithmVersion` field.

## 2. Files Modified
- `apps/backend/src/modules/vendor-slip/vmms/domain/models/replay-result.ts`
- `apps/backend/src/modules/vendor-slip/vmms/application/vmms-replay.service.ts`
- `apps/backend/src/modules/vendor-slip/vmms/tests/unit/vmms-replay.controller.spec.ts`
- `apps/backend/src/modules/vendor-slip/vmms/tests/unit/vmms-replay.service.spec.ts`
- `apps/backend/src/modules/vendor-slip/vmms/api/dto/vmms-replay.dto.ts` (added definite assignment assertion to pass tsc strict compilation)

## 3. Public API Before/After

**Before:**
```json
{
  "invoiceId": "uuid",
  "historicalDecision": { /* VendorMatchDecision payload */ },
  "simulatedDecision": { 
      "vendorLedgerId": "uuid-456",
      "isAutomated": true,
      "matchEvidence": { /* MatchEvidence payload */ }
  },
  "outcome": "IMPROVED",
  "explanation": "...",
  "evidence": { /* MatchEvidence payload */ },
  "replayTimestamp": "...",
  "algorithmVersion": "v1.0"
}
```

**After (Aligned to PHASE_C_API_CONTRACT.md):**
```json
{
  "invoiceCandidateId": "uuid",
  "simulatedDecision": {
    "stage": "STAGE_1_EXACT_GSTIN",
    "vendorLedgerId": "uuid-456",
    "confidence": 100
  },
  "originalDecision": {
    "stage": "STAGE_2_NORMALIZED_GSTIN",
    "vendorLedgerId": "uuid-456",
    "confidence": 85
  },
  "diffStatus": "IMPROVED"
}
```

## 4. Enum Before/After
- **Before:** Invented `ReplayOutcome` (`IDENTICAL`, `IMPROVED`, `DEGRADED`, `CHANGED`, `UNCHANGED`).
- **After:** Completely deleted. Now utilizes string literals directly mapped to `diffStatus` to prevent injecting unauthorized Typescript enums into the frozen domain.

## 5. DTO Before/After
- **Before:** Used `invoiceCandidateId` but returned `invoiceId` in output.
- **After:** Strictly uses `invoiceCandidateId` across all inputs and outputs. `ReplayResult` interface now completely mirrors the `PHASE_C_API_CONTRACT.md`.

## 6. Validation Results
- `npx prisma validate` -> Valid Schema 🚀
- `npx prisma generate` -> Success.
- `npx tsc --noEmit` -> 0 errors.

## 7. Test Results
- `npm run test apps/backend/src/modules/vendor-slip/vmms`
- **Tests Passed:** 63 / 63 across 14 suites.
- All unit tests updated to assert against `diffStatus` and `originalDecision` fields cleanly.

## 8. Final Statement
**VERIFIED:** The implementation of Commit 3 has been strictly aligned and stripped of all extraneous fields and enums. It now **exactly matches** the frozen architecture defined in `PHASE_C_API_CONTRACT.md` and is approved for Commit 4.
