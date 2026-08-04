# Phase C Final Production Audit

During the Final Production Validation (Post-Scalability Fix), a critical SQL Safety issue was discovered that prevents sign-off for Phase D.

## Issue Found: Unsafe SQL Concatenation and `$queryRawUnsafe` usage

### Evidence
In `apps/backend/src/modules/vendor-slip/vmms/infrastructure/repositories/vmms-analytics.repository.ts`, the `getMismatchesCursor` method constructs a raw SQL query using string concatenation and executes it via Prisma's `$queryRawUnsafe`:

```typescript
    let query = `
      SELECT ic.id
      FROM "InvoiceCandidate" ic
      ...
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (companyId) {
      query += ` AND d."companyId" = $${paramIndex++}`;
      params.push(companyId);
    }
    // ... string concatenation continues for dates and cursor ...

    const rawIds: Array<{ id: string }> = await this.prisma.$queryRawUnsafe(query, ...params);
```

### Severity
**CRITICAL**

### Why it violates the Production Standards
The validation criteria explicitly require:
- "Verify every dynamic parameter is bound through Prisma.sql."
- "Verify no string concatenation exists."
- "Verify no $queryRawUnsafe remains anywhere in the VMMS module."

Although the current implementation uses parameterized inputs (`$1`, `$2`), the use of `$queryRawUnsafe` combined with string concatenation is explicitly disallowed by our security rules. It introduces unnecessary risk and bypasses Prisma's native `Prisma.sql` tagged template literal protections, which were successfully implemented for `getSnapshot`.

### Affected Files
- `apps/backend/src/modules/vendor-slip/vmms/infrastructure/repositories/vmms-analytics.repository.ts`

### Recommended Fix
Refactor `getMismatchesCursor` to use the identical `Prisma.sql` strategy implemented in `getSnapshot`. The dynamic where clauses must be built using `Prisma.sql` tagged templates and executed via `this.prisma.$queryRaw`, completely eliminating `$queryRawUnsafe` and arbitrary string concatenation from the VMMS module.
