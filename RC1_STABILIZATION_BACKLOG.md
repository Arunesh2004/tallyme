# RC1 Stabilization Backlog

## 1. Executive Summary
A read-only evidence verification was conducted based on the `TALLYME_RC1_CERTIFICATION.md` report. The verification physically inspected backend controllers, the configuration service, API contracts, type safety decay, and product constitution constraints. This backlog transforms the verified failures into actionable, prioritized stabilization tasks. No code was modified during this verification.

## 2. Verified Critical Issues
1. **Unprotected Operational API Endpoints:** Numerous controllers expose sensitive operational data without authentication or authorization wrappers.
2. **Configuration Persistence Mocked:** The core global configuration service (`AdminConfigController`) does not persist modifications, causing configurations to revert to hardcoded values upon restart.

## 3. Verified High Severity Issues
1. **Prolific Untyped Variables:** The backend codebase relies heavily on the `any` keyword across core infrastructure, bypassing TypeScript compile-time safety.
2. **Missing Input Validation:** Mutation endpoints (e.g., `PUT /admin/config`) accept arbitrary `any` payloads instead of explicit DTO classes, bypassing `class-validator` decorators.

## 4. Verified Medium Severity Issues
1. **Unbounded Memory Aggregation:** `AuditAggregatorService` loads large data sets into application memory before sorting and slicing due to the lack of an offset/cursor pagination pattern.

## 5. Verified Low Severity Issues
1. **Frontend Error Typecasting:** Legacy UI components typecast Axios errors blindly (`error as any`) instead of properly checking `error instanceof Error`.

## 6. Security Inventory (Issue 1 Verification)
The following controllers were verified to be **missing** `@UseGuards` decorators:

- **AdminConfigController** (`src/modules/operations/controllers/admin-config.controller.ts`)
  - Routes: `GET /admin/config`, `PUT /admin/config`
  - Authentication: **No**
  - Authorization: **No**
  - Evidence: Verified via missing `@UseGuards` in source file.
  - Impact: Unauthorized actors can modify simulated operational limits.
  - Priority: Critical

- **AuditController** (`src/modules/operations/controllers/audit.controller.ts`)
  - Routes: `GET /audit/events`
  - Authentication: **No**
  - Authorization: **No**
  - Evidence: Verified via missing `@UseGuards` in source file.
  - Impact: Unauthorized actors can view sensitive document UUIDs and worker status logs.
  - Priority: Critical

- **MonitoringController** (`src/modules/operations/controllers/monitoring.controller.ts`)
  - Routes: `GET /erp/status`, `GET /erp/history`, `GET /tally/migrations`
  - Authentication: **No**
  - Authorization: **No**
  - Evidence: Verified via missing `@UseGuards` in source file.
  - Impact: Unauthorized actors can monitor ERP sync statuses and view Tally integration metadata.
  - Priority: Critical

*(Note: Other internal capability/dashboard controllers were also identified, but the above three represent the highest operational risk.)*

## 7. DTO Validation Inventory (Issue 3 Verification)
- **Endpoint:** `PUT /admin/config`
  - Request DTO exists? **No**
  - Validation decorators? **No**
  - Body typed? **No** (`@Body() body: any`)
  - Evidence: Extracted from `admin-config.controller.ts:31`

## 8. Type Safety Inventory (Issue 2 Verification)
Search queries were run across the repository to determine the proliferation of the `any` keyword.

- **A: Production Backend:** ~657 occurrences (including legacy mappers, loggers, caches, and event architectures).
- **B: Production Frontend:** ~40 occurrences (including legacy `useVendors.ts`, `vendor-review-table.tsx`).
- **C: Tests:** ~45 occurrences (including mock structures and spy injections).
- **D: Generated Code / XML:** N/A
- **E: Third-party Packages:** Excluded from stabilization scope.

*Only Categories A and B represent production technical debt.*

## 9. Configuration Assessment (Issue 4 Verification)
- **GET `/admin/config`**: Returns a hardcoded JSON object. Does not interact with Prisma.
- **PUT `/admin/config`**: Accepts an untyped body and returns `{ message: 'Configuration updated successfully (Simulated)' }`.
- **Prisma Involvement:** The controller injects `PrismaService` but it is completely unused.
- **Evidence:** `AdminConfigController` source explicitly contains the comment: `// In a real scenario, this would validate and save to DB`.

## 10. API Contract Assessment (Issue 5 Verification)
- **No Mismatches Found:** The frontend perfectly restricts itself to consuming the endpoints exactly as they are currently implemented. 
- The frontend correctly respects the simulated behaviour of the configuration module and properly aggregates the audit payloads. No phantom APIs were requested.

## 11. Product Constitution Assessment (Issue 6 Verification)
- **Violation Found:** By utilizing a simulated `AdminConfigController`, the application violates the foundational expectation of stateful persistence, treating critical operational variables as ephemeral mocked properties. This must be remediated.
- **Success:** The frontend firmly adhered to its presentation-only boundary. No accounting logic was duplicated.

## 12. Recommended Stabilization Order
1. **Critical Authentication Pass:** Apply global or controller-level `JwtAuthGuard` and `RolesGuard` to `AdminConfigController`, `AuditController`, and `MonitoringController`.
2. **Configuration Persistence Pass:** Replace the simulated `AdminConfigController` with a real `ConfigurationService` backed by Prisma.
3. **DTO & Validation Pass:** Implement strong Request/Response DTOs across the Operations module.
4. **Type Safety Pass:** Refactor legacy frontend queries and legacy backend services to eliminate the `any` keyword.

## 13. Estimated Number of Independent Work Packages
Based on the evidence, the stabilization effort can be securely divided into **four (4) independent work packages**, corresponding to the recommended stabilization order.

## 14. Final Recommendation
Do not proceed with Feature Phase E until the 4 work packages outlined in this stabilization backlog are completed and verified. Proceeding with feature development over a fundamentally unprotected operations layer will compound technical debt and pose a critical security risk to the accounting workflows.
