# VENDOR REVIEW WORKFLOW REPORT

**Date:** 2026-07-24  
**Phase:** 12 — Production Gap Closure  
**Audit Finding:** `ManualReviewController.approveReview()` returned `{id, status: 'APPROVED'}` without touching the database. Review approvals were no-ops.

---

## Root Cause

The original implementation was:

```typescript
@Post(':id/approve')
async approveReview(@Param('id') id: string) {
  // 1. Mark as Approved
  // 2. Publish event to continue pipeline
  return { id, status: 'APPROVED' };
}
```

Both steps were commented-out TODOs. No database writes occurred. The `ManualReviewTask` remained in `PENDING` state. The `InvoiceCandidate` remained in `MANUAL_REVIEW_REQUIRED` state. No pipeline events were dispatched.

---

## Full Lifecycle Implementation

### Files Modified

| File | Change |
|------|--------|
| `src/modules/vendor-slip/api/manual-review.controller.ts` | **Full workflow implementation** with DB transactions and audit logging |
| `src/modules/vendor-slip/vendor-slip.module.ts` | Added `ManualReviewController` to controllers array; added `PrismaModule` import |

### Approval Lifecycle (`POST /manual-review/:id/approve`)

```
Step 1: Validate ManualReviewTask exists and status === 'PENDING'
  → prisma.manualReviewTask.findUnique({ where: { id } })
  → Throw NotFoundException if not found
  → Throw BadRequestException if status !== 'PENDING'

Step 2: Validate linked InvoiceCandidate
  → task.entityType === 'InvoiceCandidate' required
  → prisma.invoiceCandidate.findUnique({ where: { id: task.entityId } })
  → Throw NotFoundException if not found
  → Throw BadRequestException if status !== 'MANUAL_REVIEW_REQUIRED'

Step 3: Atomic database transaction
  → tx.manualReviewTask.update({ status: 'RESOLVED', resolution: 'APPROVED', assignedTo: reviewerId })
  → tx.invoiceCandidate.update({ status: 'APPROVED' })
  → tx.vendorSlipAudit.create({ action: 'MANUAL_REVIEW_APPROVED', metadata: { reviewTaskId, reviewerId, approvedAt } })

Step 4: Re-enter pipeline (outside transaction, best-effort)
  → queueService.addJob('vendor-slip-queue', 'process-vendor-slip', { candidateId, companyId: 'COMP-1' })
  → VendorSlipWorker receives job → Accounting Engine → VoucherCandidate → ERP
```

### Rejection Lifecycle (`POST /manual-review/:id/reject`)

```
Step 1: Validate task exists and is PENDING

Step 2: Atomic database transaction
  → tx.manualReviewTask.update({ status: 'REJECTED', resolution: reason, assignedTo: reviewerId })
  → tx.invoiceCandidate.update({ status: 'FAILED' })
  → tx.vendorSlipAudit.create({ action: 'MANUAL_REVIEW_REJECTED', metadata: { reason, rejectedAt } })

Step 3: No pipeline dispatch (rejection terminates the workflow)
```

### List Reviews (`GET /manual-review`)
```
→ prisma.manualReviewTask.findMany({ where: { status: 'PENDING' } })
→ Returns all pending tasks with metadata
```

### Get Single Review (`GET /manual-review/:id`)
```
→ prisma.manualReviewTask.findUnique({ where: { id } })
→ If entityType === 'InvoiceCandidate': also fetches InvoiceCandidate detail
→ Returns task + candidate details for reviewer UI
```

---

## Architectural Compliance

This implementation preserves the canonical **Vendor Slip Automation** workflow defined in `PRODUCT_CONSTITUTION.md`:

```
... Manual Review (if required) → [APPROVAL HERE] → VoucherCandidate → Shared Accounting Engine → ERP
```

The approved candidate is dispatched to `vendor-slip-queue` which routes through `VendorSlipWorker` → `VOUCHER_BUILDER_QUEUE` → `VoucherBuilderWorker` → `ERPConnectorEngine` → Tally. No accounting logic was duplicated.

---

## Verification

| Test | Expected | Mechanism |
|------|----------|-----------|
| Approve non-existent task | `404 NotFoundException` | `findUnique` returns null → thrown |
| Approve task not in PENDING | `400 BadRequestException` | Status check before transaction |
| Approve valid task | ManualReviewTask → RESOLVED, InvoiceCandidate → APPROVED, audit entry created, BullMQ job dispatched | Atomic $transaction + queueService.addJob |
| Reject valid task | ManualReviewTask → REJECTED, InvoiceCandidate → FAILED, audit entry created | Atomic $transaction |
| Reviewer identity tracked | `assignedTo` populated from JWT user.id | `req.user.id` from JwtAuthGuard |

> **Note**: Full runtime evidence requires a live PostgreSQL database with a ManualReviewTask linked to an InvoiceCandidate in MANUAL_REVIEW_REQUIRED status, plus a running BullMQ+Redis instance.
