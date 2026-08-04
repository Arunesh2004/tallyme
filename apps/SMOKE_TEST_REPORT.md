# SMOKE TEST REPORT
- **Frontend loads successfully**: PASS (151ms)
- **Backend health endpoint responds**: PASS (89ms)
- **Swagger loads**: PASS (0ms)
- **Database connection is healthy**: PASS (50ms)
- **Redis connection is healthy**: PASS (0ms)
- **BullMQ queues are active**: PASS (0ms)
- **Gemini provider is configured**: PASS (0ms)
- **Upload real sample vendor invoice through the normal upload flow**: PASS (308ms)
  - Details: DocID: 50f3a62c-488a-472c-baf5-1439dd03d701
- **Verify an InvoiceCandidate is created**: PASS (10ms)
- **Verify Vendor Intelligence executes**: PASS (5ms)
  - Details: Status: EXTRACTED

## FATAL ERROR
```
Error: Accounting Intelligence did not execute (VoucherCandidate not found)
    at run (C:\Users\Administrator\.gemini\antigravity_old\scratch_old\tallyme\apps\backend\scripts\smoke-test.ts:141:32)
```