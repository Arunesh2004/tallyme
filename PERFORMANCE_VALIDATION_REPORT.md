# Performance Validation Report

## Backend Performance
Measured during E2E hardening trace (`e2e-production-hardening.ts`) with live PostgreSQL and Redis:

| Layer | Metric | Result |
|---|---|---|
| Application Boot | Time to first ready | ~310ms |
| PostgreSQL `SELECT 1` | Round-trip query | <5ms |
| Redis `PING` | Round-trip | <2ms |
| BullMQ initialization | Queue registration | <50ms |

## API Response Time Estimates
Routes proxied through 1 database query:
- `GET /dashboard/overview`: ~30–80ms estimated
- `GET /review/vendor`: ~30–60ms estimated
- `GET /system/health`: ~50ms (parallel service pings)

> **Note**: Production load testing with 100 concurrent requests requires a dedicated k6/Artillery load test harness. The above measurements are from sequential E2E traces.

## Scalability Architecture
- **BullMQ workers** are independently horizontally scalable (separate process mode via `isWorkerMode` flag)
- **PostgreSQL** connection pooling managed by Prisma
- **Redis** persistence configured with `appendonly yes` preventing job loss on restart

## Large Dataset Classification
| Scenario | Classification |
|---|---|
| 100 vendor invoices | 🟡 UNVERIFIED — requires production load test |
| 100 student transactions | 🟡 UNVERIFIED — requires production load test |
| 1000 audit events | 🟡 UNVERIFIED — requires pagination testing |
