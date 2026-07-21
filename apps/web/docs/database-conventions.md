# Database Conventions

## Primary Key Strategy
- All tables must use `id` as the primary key.
- The data type is `String` mapped to PostgreSQL `uuid`.
- We prefer UUIDv7 (time-ordered) generated application-side for optimal B-Tree insertion performance and distributed ID generation, though `uuid()` defaults (v4) are acceptable at the DB level for fallbacks.

## Naming Conventions
- **Tables:** PascalCase in Prisma schema (e.g., `AuditLog`), mapped to snake_case in PostgreSQL (e.g., `audit_logs`).
- **Columns:** camelCase in Prisma (e.g., `organizationId`), mapped to snake_case in PostgreSQL (e.g., `organization_id`).
- **Enums:** PascalCase for enum names, UPPER_SNAKE_CASE for values.
- **Indexes:** Prefix with `idx_` followed by table name and column(s) (e.g., `idx_users_organization_id`).
- **Foreign Keys:** Prefix with `fk_` (handled automatically by Prisma, but explicitly named if raw SQL is used).

## Audit & Lifecycle Standards
Every transactional and master table MUST include:
- `createdAt` (`DateTime @default(now())`)
- `updatedAt` (`DateTime @updatedAt`)
- `deletedAt` (`DateTime?`) - Soft delete support. Records are NEVER physically deleted.
- `createdBy` (`String?`) - User UUID.
- `updatedBy` (`String?`) - User UUID.
- `deletedBy` (`String?`) - User UUID.
- `version` (`Int @default(1)`) - Optimistic locking support to prevent concurrent overwrites.

## Multi-Tenancy
Any table containing tenant-specific data MUST include:
- `organizationId` (`String`)
- A foreign key relation to the `Organization` table.
- A composite index starting with `organizationId` for query performance and RLS prep (e.g., `@@index([organizationId])`).

## Migrations
- Migrations are strictly forward-only.
- Never modify a committed migration. Create a new one.
- Avoid destructive operations (e.g., dropping columns) without an accompanying ADR.
