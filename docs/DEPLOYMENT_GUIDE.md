# TallyMe Enterprise Deployment Guide

## Overview
This guide covers the deployment of TallyMe Enterprise to a multi-node Kubernetes cluster. The architecture leverages Horizontal Pod Autoscaling (HPA), Redis Distributed Locks for cron safety, and a robust `initContainer` for Prisma migrations.

## Pre-requisites
- Kubernetes 1.25+ cluster
- PostgreSQL 15+ (e.g., AWS RDS or Azure Flexible Server)
- Redis 7+ (e.g., Elasticache)
- External Secrets Operator installed in the cluster (for AWS Secrets Manager / HashiCorp Vault)
- GitHub Container Registry (GHCR) access

## CI/CD Pipeline
Deployment images are automatically built and published via `.github/workflows/backend.yml`.
The pipeline uses `npx prisma migrate status` to validate the Prisma schema state and `npx prisma validate`. It outputs a production-ready image (`ghcr.io/tallyme/backend:latest`) with dev-dependencies omitted (`npm ci --omit=dev`).

## Deployment Steps

1. **Apply Secrets:**
   Ensure the `tallyme-secrets-external` ExternalSecret is applied, fetching credentials from your provider:
   ```bash
   kubectl apply -f k8s/external-secrets.yaml
   ```

2. **Apply Configurations:**
   ```bash
   kubectl apply -f k8s/deployment.yaml
   ```

3. **Database Migrations (Automated):**
   When `k8s/deployment.yaml` is applied, the `tallyme-api` deployment uses an `initContainer` to automatically execute `npx prisma migrate deploy`. **The main API containers will not boot until this migration completes successfully.**

## Worker Safety (Distributed Cron Locks)
Background tasks (`OutboxCleanupWorker`, `VoucherCleanupWorker`, `ERPReconciliationWorker`, `OutboxRecoverySweeper`) are protected from split-brain concurrent execution via a **Distributed Redis Lock** (`cron_lock:*`). You may safely scale the `tallyme-worker` deployment to multiple replicas.

## Load Testing
A k6 baseline script is provided in `load-testing/k6-baseline.js`.
To execute a load test against your staging or production cluster:
```bash
k6 run load-testing/k6-baseline.js -e API_URL=https://api.tallyme.com/api/v2 -e AUTH_TOKEN=your_token
```

## Rollback Procedure
If a deployment fails, use the standard Kubernetes rollout undo command:
```bash
kubectl rollout undo deployment/tallyme-api -n tallyme
kubectl rollout undo deployment/tallyme-worker -n tallyme
```
*Note: Database rollbacks must be handled manually or via Point-In-Time-Recovery (PITR).*
