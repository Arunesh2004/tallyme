# TallyMe Enterprise — Deployment Guide

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | ≥18 LTS | Required for NestJS and Next.js |
| PostgreSQL | 15 | Persistent relational store |
| Redis | 7 | BullMQ queue backend |
| Docker | 24+ | Container orchestration |
| Docker Compose | v2.x | Multi-service orchestration |

---

## 1. Environment Configuration

Copy and complete the template:

```bash
cp .env.production.example .env
```

Mandatory variables:
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/tallymedb
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=<minimum-32-char-secret>
TALLY_HOST=192.168.x.x
TALLY_PORT=9000
AZURE_OCR_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_OCR_KEY=<azure-key>
GEMINI_API_KEY=<gemini-key>
GMAIL_CLIENT_ID=<oauth-client-id>
GMAIL_CLIENT_SECRET=<oauth-secret>
GMAIL_PUBSUB_TOPIC=projects/your-project/topics/tallyme-mail-watch
FRONTEND_URL=https://your-dashboard.domain.com
```

---

## 2. Database Migration

> ⚠️ Never use `prisma db push` in production. It can cause data loss.

```bash
# Verify pending migrations before deploying
npx prisma migrate status

# Apply migrations deterministically
npx prisma migrate deploy
```

**Pre-migration checklist:**
- [ ] PostgreSQL backup (pg_dump) completed
- [ ] Migration status shows expected pending migrations
- [ ] Rollback plan documented

---

## 3. Docker Deployment

```bash
# Build and start all services
docker compose up --build -d

# Verify containers are healthy
docker compose ps

# Tail backend logs
docker compose logs -f backend

# Run database migrations inside container
docker compose exec backend npx prisma migrate deploy
```

### Container Architecture
| Container | Port | Purpose |
|---|---|---|
| `tallyme-backend` | 3000 | NestJS API server |
| `tallyme-postgres` | 5432 | PostgreSQL database |
| `tallyme-redis` | 6379 | Redis queue backend |

---

## 4. Manual Build (without Docker)

```bash
# Backend
cd apps/backend
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
npm run start:prod

# Frontend
cd apps/frontend
npm ci
npm run build
npm start
```

---

## 5. Reverse Proxy (Nginx)

```nginx
server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 6. Worker Mode

BullMQ workers are controlled by the `WORKER_MODE` environment variable:

```bash
# Start in worker-only mode (separate process)
WORKER_MODE=true npm run start:prod
```

The `isWorkerMode` flag in `src/shared/utils/runtime-mode.ts` controls whether workers register in the NestJS module at boot.

---

## 7. Monitoring & Logs

- Logs are structured JSON via Pino (`LoggerService`)
- Tail with: `docker compose logs -f backend`
- BullMQ dashboard: integrate Bull Board at `/admin/queues` (requires ADMIN role)

---

## 8. Rollback Procedure

```bash
# 1. Stop the current deployment
docker compose down

# 2. Restore database backup
pg_restore -d tallymedb backup.dump

# 3. Deploy previous image tag
docker compose up -d --no-build

# 4. Verify migration state
docker compose exec backend npx prisma migrate status
```

---

## 9. Backup Strategy

```bash
# Daily PostgreSQL backup
pg_dump -h localhost -U tallyme tallymedb > backup-$(date +%F).dump

# Redis AOF (appendonly yes) persists automatically
# Verify: docker compose exec redis redis-cli CONFIG GET appendonly
```
