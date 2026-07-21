# Project Structure & Architecture Guardrails

## Folder Responsibilities
- `app/`: Next.js App Router endpoints, routing, and page layouts.
- `modules/`: Bounded contexts (e.g., Mail Intelligence, Vendor Bill).
- `shared/`: Cross-cutting concerns (Auth, DB connection, Logger).
- `prisma/`: Database schemas, seeds, and migrations.
- `tests/`: Testing infrastructure (Vitest/Playwright).

## Dependency Rules (Strict Flow)
The dependency direction is strictly downward:
`app/` → `modules/` → `services/` → `repositories/` → `database`

- **Circular Imports:** Forbidden. Will fail ESLint.
- **Upward Imports:** Forbidden. Services cannot import from `app/`.
- **Cross-Module Imports:** Forbidden. Modules communicate via `Domain Events` (Event Bus) or public service interfaces only.

## Repository Pattern
All database access must be encapsulated within Repositories inside `modules/`. Business services must never call Prisma directly.

## Logging & Workers
- **Logging:** Use the Pino instance from `shared/logging`. `console.log` is forbidden.
- **Workers:** Must implement the Base Worker class supporting grace shutdown (SIGTERM) and heartbeats.
