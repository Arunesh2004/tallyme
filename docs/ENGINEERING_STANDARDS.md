# TallyMe Enterprise

# Engineering Standards

## Introduction

This document is the official Engineering Standards Manual for TallyMe Enterprise. It is designed to be read in conjunction with the following governing documents:

- PRODUCT_CONSTITUTION.md defines **WHAT** the product is.
- ARCHITECTURE_DECISIONS.md explains **WHY** the architecture exists.
- ENGINEERING_STANDARDS.md defines **HOW** software is built.

Every future contributor, whether a human engineer or an AI agent, must follow these standards meticulously to ensure the long-term maintainability, reliability, and security of the TallyMe Enterprise platform.

---

## SECTION 1: GENERAL PRINCIPLES

- **Single Responsibility Principle:** Every class, function, and module must have exactly one reason to change.
- **Separation of Concerns:** Keep business logic strictly separated from transport layers (HTTP/Queues) and infrastructure (Database/ERP).
- **Dependency Injection:** Never tightly couple services. Always inject dependencies to ensure components are testable and isolated.
- **Composition over Inheritance:** Build complex behaviors by composing smaller, focused services rather than relying on deep, brittle inheritance chains.
- **Immutability where practical:** Favor pure functions and immutable data structures (especially in the frontend and mapping layers) to eliminate side-effect bugs.
- **No duplicated business logic:** Especially in accounting. Logic must be centralized (e.g., Shared Accounting Engine) and invoked, never rewritten.
- **Production-first engineering:** Assume the system will fail. Write code that handles failure gracefully without compromising financial data.
- **Fail fast:** Validate data at the boundary. If a payload is invalid, reject it immediately rather than propagating bad data deeper into the pipeline.
- **Observability first:** If a transaction executes, it must be traceable. Always emit structured logs, correlation IDs, and metrics.
- **Idempotency first:** Duplicate API calls or queue retries must safely resolve without duplicating accounting entries.

---

## SECTION 2: BACKEND STANDARDS

The backend is built on NestJS and must adhere strictly to its architectural patterns.

- **Folder structure:** Feature-based modularity. Group by domain (e.g., modules/vendor-slip, modules/erp-connector).
- **Controllers:** Strictly handle HTTP boundaries. They parse requests, call services, and return responses. No business logic belongs here.
- **Services:** Contain the core business logic. Must be stateless and testable.
- **Repositories:** The exclusive boundary to the database. Services must never write raw Prisma queries; they must call repositories.
- **DTOs:** Data Transfer Objects must use class-validator to strictly define the shape of incoming data.
- **Entities:** Represent domain objects and business invariants.
- **Modules:** Encapsulate features. Every module must explicitly declare its imports and exports to enforce clean boundaries.
- **Guards:** Handle authorization and permissions exclusively.
- **Interceptors:** Handle cross-cutting concerns like latency logging or payload transformations.
- **Filters:** Catch exceptions globally and map them to standard RFC-compliant Problem Details responses.
- **Providers:** Infrastructure wrappers (Redis, Gmail) must be injected via tokens.
- **Dependency Injection:** Use constructor injection strictly.
- **Naming conventions:**
  - File naming: kebab-case.suffix.ts (e.g., oucher.service.ts).
  - Function naming: camelCase describing the action (e.g., createVoucher).
  - Class naming: PascalCase (e.g., VoucherService).
- **Error handling:** Throw specific, typed domain exceptions (e.g., ERPTransportException) rather than generic Error.
- **Validation:** Validate at the boundary using pipes. Reject unknown properties natively.
- **Logging:** Use the injected LoggerService. Never use console.log.
- **Documentation expectations:** Use JSDoc for complex logic and class interfaces. Code should generally be self-documenting through clear naming.

---

## SECTION 3: FRONTEND STANDARDS

The frontend is built on Next.js (App Router).

- **App Router:** Use the pp/ directory strictly for routing.
- **Server Components:** Default to React Server Components (RSC) for data fetching to reduce bundle size.
- **Client Components:** Use "use client" only at the leaves of the component tree when interactivity (state/effects) is required.
- **Component organization:** Group components by feature. Reusable UI components live in components/ui/.
- **Hooks:** Extract complex React state logic into custom hooks.
- **Context:** Use React Context sparingly, only for global state (e.g., Theme, Auth) to prevent unnecessary re-renders.
- **API layer:** Centralize API fetching via typed fetch wrappers or tools like React Query for client-side state.
- **Forms:** Use robust form state management (e.g., React Hook Form) coupled with validation resolvers (e.g., Zod).
- **Validation:** Share validation schemas with the backend where possible.
- **Loading states:** Always provide skeleton loaders or spinners for async operations.
- **Error states:** Implement Error Boundaries to gracefully catch rendering errors.
- **Review pages:** Manual review portals must clearly present original artifacts (e.g., PDF) alongside extracted data for human validation.
- **Dashboard pages:** Focus on actionable operational health metrics.
- **Naming conventions:** Use PascalCase for React components and kebab-case for file names containing them.

---

## SECTION 4: DATABASE STANDARDS

Prisma is the ORM.

- **Schema naming:** PascalCase for models, camelCase for fields.
- **Migration strategy:** Use prisma migrate dev for schema evolution. Never modify the database directly outside of Prisma.
- **Indexes:** explicitly define indexes on foreign keys, lookup fields, and unique constraints to guarantee performance.
- **Transactions:** Complex financial creations (e.g., Voucher + Ledger mapping) must execute inside a $transaction.
- **Soft delete policy:** Never physically delete financial or audit data. Implement soft deletes (deletedAt).
- **Audit fields:** All models must include createdAt and updatedAt.
- **Foreign keys:** Strictly define relationships to guarantee referential integrity.
- **Constraints:** Enforce uniqueness at the database level, not just in application logic.
- **Versioning:** Critical entities (like an approved Voucher Candidate) should remain immutable; corrections require a new version or an explicit reversal.

---

## SECTION 5: QUEUE STANDARDS

BullMQ manages asynchronous workflows.

- **Job naming:** Use descriptive, static job names (e.g., SYNC_ERP_VOUCHER).
- **Queue naming:** Separate queues by priority and domain (e.g., ccounting-queue, ocr-queue).
- **Retries:** All network-dependent jobs must implement exponential backoff.
- **Backoff:** Start with a minimum delay (e.g., 1000ms) and scale exponentially to avoid DDoSing downstream services.
- **Timeouts:** Jobs must have explicit timeouts to prevent stalled workers.
- **Dead-letter handling:** Failed jobs must move to a DLQ/failed state after exhausting retries for manual operator intervention.
- **Worker ownership:** Workers must be stateless and idempotent.
- **Idempotency:** A job must be safe to execute multiple times.
- **Duplicate prevention:** Use BullMQ jobId strategically (e.g., mapping to a unique transaction ID) to prevent enqueueing duplicate tasks.
- **Monitoring:** Monitor active, waiting, and failed counts via Prometheus.

---

## SECTION 6: ACCOUNTING STANDARDS

TallyMe is an accounting platform. Strict financial integrity is paramount.

- **VoucherCandidate creation:** All workflows must produce a VoucherCandidate. This is the singular schema accepted by the Shared Accounting Engine.
- **Voucher validation:** Vouchers must structurally balance (Debits = Credits) before reaching the ERP connector.
- **Ledger mapping:** Dynamic entity references must be securely mapped to exact Ledger Codes.
- **Duplicate detection:** The engine must enforce strict duplicate prevention based on reference IDs, hashes, and temporal windowing.
- **Accounting invariants:** Financial logic cannot be bypassed by any endpoint.
- **ERP communication:** The engine initiates communication exclusively through the ERP Connector abstraction.
- **Tally XML generation:** XML generation is centralized. String concatenation of XML outside the builder is forbidden.
- **No accounting logic outside Shared Accounting Engine:** Period.

---

## SECTION 7: ERP STANDARDS

- **Connector interface:** The ERP Connector must define a strict interface ensuring swapping ERPs does not impact the Shared Accounting Engine.
- **Retries:** Transient HTTP failures must trigger job retries.
- **Timeouts:** Use AbortController to enforce strict HTTP timeouts against legacy ERP instances.
- **Transport abstraction:** Hide HTTP details (headers, fetch) inside the transport layer.
- **XML builder:** Encapsulate Tally-specific formatting quirks within the Builder module.
- **Future ERP support:** Connectors should map the generic VoucherCandidate to the specific ERP format (e.g., JSON for modern REST APIs).
- **Testing strategy:** The connector must be exhaustively tested via mock servers to validate idempotency and timeout handling.

---

## SECTION 8: TESTING STANDARDS

- **Unit Tests:** Business logic, mappers, and pure functions must have high unit coverage.
- **Integration Tests:** Database repositories and API endpoints must be tested against a real (test) database.
- **API Tests:** Use Supertest for e2e validation of controllers.
- **Queue Tests:** Verify that jobs are enqueued correctly and that workers process payloads gracefully.
- **ERP Tests:** Live tests must run against the ERP mock or a staging Tally instance.
- **Regression Tests:** Every reported bug must be accompanied by a regression test prior to merging the fix.
- **Naming conventions:** Suffix test files with .spec.ts or .e2e-spec.ts. Use describe and it blocks descriptively.
- **Coverage expectations:** Core accounting and validation logic require 100% coverage.
- **Mocking policy:** Mock external network boundaries (Gmail, Tally) unless running explicit live integrations. Do not mock internal business logic inside integration tests.

---

## SECTION 9: LOGGING STANDARDS

- **Log levels:** 
  - ERROR: System failures requiring immediate attention.
  - WARN: Handled exceptions or degraded states.
  - INFO: Normal business milestones (e.g., "Voucher Synced").
  - DEBUG: Verbose tracing for development.
- **Correlation IDs:** Every incoming HTTP request or Queue Job must generate a Correlation ID that persists across all log statements for that transaction.
- **Request IDs:** Log incoming HTTP requests and their latency natively.
- **Error Codes:** Domain exceptions must include a deterministic error code (e.g., ERP_TIMEOUT).
- **PII redaction:** Never log passwords, tokens, or sensitive user details.
- **Sensitive data:** Exclude full invoice contents or email bodies from INFO logs.
- **Audit logging:** Manual human interventions (e.g., approving a review candidate) must write immutable audit records to the database.

---

## SECTION 10: SECURITY STANDARDS

- **Authentication:** All routes must be protected by NextAuth / JWT guards by default.
- **Authorization:** Enforce role-based access control (RBAC) where necessary.
- **Validation:** Trust no input. Use strict validation pipes.
- **Secrets:** Never commit secrets. Use .env and configure them dynamically via a Secret Manager in production.
- **Environment variables:** Validate on startup (using Zod or Joi) to prevent the app from booting with missing configurations.
- **File uploads:** Enforce maximum file sizes (e.g., 10MB) and strict MIME type checking at the ingress controller.
- **Rate limiting:** Protect public-facing endpoints (like Webhooks or Login) with memory/Redis rate limiters.
- **Dependency updates:** Regularly audit NPM dependencies for known CVEs.

---

## SECTION 11: GIT STANDARDS

- **Branch naming:** Use prefixes eature/, ugfix/, hotfix/, or chore/ followed by a descriptive name.
- **Commit message convention:** Use Conventional Commits (eat:, ix:, efactor:, docs:).
- **Pull request checklist:** PRs must include tests, updated documentation, and pass CI checks.
- **Code review expectations:** Reviewers must verify adherence to the Product Constitution.
- **Merge policy:** Squash and merge to keep the main branch history clean and linear.

---

## SECTION 12: DOCUMENTATION STANDARDS

Every new feature or major change must include:
- **Architecture impact:** Does it align with the Shared Accounting Engine?
- **ADR impact:** Requires a new ADR if deviating from established patterns.
- **API documentation:** Must update Swagger/OpenAPI decorators.
- **Tests:** Documentation is useless if behavior isn't proven by tests.
- **Operational notes:** Document required environment variables or Redis configuration changes.
- **Migration notes:** Include instructions if a Prisma migration requires manual data backfilling.

---

## SECTION 13: AI CONTRIBUTOR RULES

Every AI agent working on this repository must:
1. Read PRODUCT_CONSTITUTION.md first.
2. Read ARCHITECTURE_DECISIONS.md second.
3. Read ENGINEERING_STANDARDS.md third.

Before implementing any change, verify:
1. Does this preserve the two mandatory core workflows?
2. Does this preserve the Shared Accounting Engine?
3. Does this duplicate accounting logic?
4. Does this violate an ADR?
5. Does this violate an engineering standard?

If any answer is **YES**, stop and explain why.

---

# Engineering Philosophy

The permanent philosophy of TallyMe Enterprise revolves around uncompromised stability and rigorous discipline:

- **Build for production:** Assume it's live. Write code that handles real-world failure.
- **Architecture over shortcuts:** Never compromise the long-term integrity of the system for short-term speed.
- **One accounting engine:** Centralize financial truth.
- **No duplicated accounting logic:** Code duplication in accounting breeds financial discrepancies.
- **High observability:** A system you cannot debug in production is a broken system.
- **Reliability over speed:** Financial transactions must be accurate. Fast but wrong is unacceptable.
- **Maintainability over cleverness:** Write readable, explicit code. Future engineers will thank you.
- **Document decisions:** Explain the *why* via ADRs.
- **Test before deployment:** Coverage provides the confidence to move forward.
- **Protect financial integrity:** Zero tolerance for double-booking or dropped vouchers.

This handbook is the absolute standard. Follow it strictly.
