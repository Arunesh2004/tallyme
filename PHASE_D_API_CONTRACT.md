# Phase D API Contract

## 1. VMMS Manual Review Approval

This endpoint replaces the legacy manual review mutation for invoices that were processed under VMMS Enforcement. It allows human operators to manually resolve an invoice that failed automated matching.

**Endpoint:** `POST /api/v1/vmms/review/approve`  
**Authorization:** Required (Accounting Admin or Principal)

### Request DTO
```json
{
  "invoiceCandidateId": "uuid",
  "vendorBranchId": "uuid",
  "comment": "string (required, min 10 chars)"
}
```

### Response DTO (201 Created)
```json
{
  "success": true,
  "vendorMatchDecisionId": "uuid",
  "voucherEnqueued": true
}
```

### Validation Rules
1. **State Machine:** `invoiceCandidateId` must exist and its status must be exactly `MANUAL_REVIEW_REQUIRED`.
2. **Referential Integrity:** `vendorBranchId` must exist in the `VendorBranch` table and be associated with the same `companyId` as the invoice.
3. **Audit Compliance:** `comment` is strictly mandatory to populate the `VendorAudit` trail for compliance tracking.
4. **Immutability:** If a `VendorMatchDecision` already exists for this invoice (e.g. from shadow execution), it is either updated or soft-deleted/replaced to reflect the manual override, ensuring exactly one active decision per invoice.
