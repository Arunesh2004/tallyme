# TallyMe Enterprise — Developer Onboarding Guide

## Repository Structure

```
tallyme/
├── apps/
│   ├── backend/              # NestJS API server
│   │   ├── src/
│   │   │   ├── app.module.ts         # Root module
│   │   │   ├── main.ts               # Bootstrap entry point
│   │   │   ├── bootstrap/            # App configuration helpers
│   │   │   ├── core/                 # Logger, config, Prisma, Redis
│   │   │   ├── infrastructure/       # BullMQ, cache, database services
│   │   │   ├── shared/               # Utilities, runtime-mode flag
│   │   │   └── modules/
│   │   │       ├── auth/             # JWT + RBAC
│   │   │       ├── vendor-slip/      # Vendor pipeline
│   │   │       ├── voucher-builder/  # Shared VoucherCandidate builder
│   │   │       ├── erp-connector/    # Tally XML/transport/queue
│   │   │       ├── student-fee/      # Student payment orchestration
│   │   │       ├── student-matching/ # Admission number matching
│   │   │       ├── fee-validation/   # Allocation + duplicate rules
│   │   │       ├── fee-automation/   # Email processing workers
│   │   │       ├── mail/             # Gmail watch service
│   │   │       ├── payment-parser/   # AI payment extraction
│   │   │       ├── operations/       # Health, dashboard, capabilities
│   │   │       └── operations-portal/# Review queue, audit, migration
│   │   └── prisma/
│   │       ├── schema.prisma
│   │       └── migrations/
│   └── frontend/             # Next.js Operations Portal
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .env.production.example
├── PRODUCT_CONSTITUTION.md   # MANDATORY - read before any change
├── ARCHITECTURE_DECISIONS.md # ADR records
└── ENGINEERING_STANDARDS.md  # Coding rules
```

---

## Running Locally

```bash
# 1. Install backend dependencies
cd apps/backend
npm ci

# 2. Start PostgreSQL and Redis (Docker)
docker compose up postgres redis -d

# 3. Set up .env
cp .env.production.example .env
# Edit DATABASE_URL, JWT_SECRET at minimum

# 4. Run migrations
npx prisma migrate dev

# 5. Start backend
npm run start:dev

# 6. Start frontend (separate terminal)
cd apps/frontend
npm ci
npm run dev
```

---

## Architecture Principles (MANDATORY)

Before writing any code, read `PRODUCT_CONSTITUTION.md`. Key rules:

1. **Two canonical workflows only**: Vendor Slip Automation and Student Fee Automation
2. **One Shared Accounting Engine**: `VoucherBuilderEngine` — never create a second one
3. **One ERP Connector**: `TallyTransportService` — never bypass it
4. **All accounting flows through**: `VoucherCandidate` → `AccountingEngine` → `ERPConnector`

---

## Adding a New Module

```bash
# Generate module scaffold
nest g module modules/my-feature
nest g service modules/my-feature
nest g controller modules/my-feature
```

Rules:
- Never import `ERPConnectorModule` directly — communicate via events or the accounting engine
- Never calculate voucher amounts — that's the `VoucherBuilderEngine`'s job
- Always define a domain interface before writing an implementation
- Always add unit tests before submitting

---

## Testing

```bash
# Run all tests
npm test

# Run a specific test file
npm test -- erp-connector.integration

# Run with coverage
npm test -- --coverage
```

Test suites:
- `*.spec.ts` — Unit/integration tests (always run in CI)
- `*live*.spec.ts` — Live Tally tests (gracefully skip when Tally unavailable)

---

## Coding Standards

See `ENGINEERING_STANDARDS.md` for full rules. Key points:
- All services must implement an interface
- All public methods must have JSDoc comments
- No `any` type — use explicit types
- Error handling via domain exceptions (see `exceptions/` directories)
- Audit logging for every state change to domain entities
- Provider injection via NestJS DI — no `new ServiceClass()` in production code

---

## Extending Workflows Safely

**To add a new extraction step to Vendor workflow:**
1. Create a new service implementing `IExtractionProvider`
2. Register it via `useFactory` in `vendor-slip.module.ts`
3. Inject into `OCRCoordinator` (not `VoucherBuilderEngine`)

**To add a new matching strategy for students:**
1. Implement the `IStudentMatchingStrategy` interface
2. Register in `student-matching.module.ts`
3. The `StudentMatchingService` will automatically pick it up via strategy pattern

**Never:**
- Add accounting logic to controllers
- Send XML to Tally from any module other than `erp-connector`
- Create a second `VoucherBuilderEngine`
