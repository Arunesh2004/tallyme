# TallyMe Enterprise — Secrets Management Guide

## Principles

1. **Never hardcode secrets** in source code, Dockerfiles, or configuration files committed to version control.
2. **Fail fast**: All required secrets are validated via Zod schema at application startup. Missing secrets abort startup immediately.
3. **Environment-driven**: Every secret is sourced from environment variables, compatible with K8s Secrets, AWS Secrets Manager, or HashiCorp Vault.
4. **Never log secrets**: Pino is configured to redact `authorization`, `cookie`, and `password` fields from all logs.

---

## Required Secrets at Startup

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection URL |
| `REDIS_HOST` | Redis host |
| `JWT_SECRET` | 32+ char JWT signing secret |
| `ENCRYPTION_KEY` | Exactly 32-byte field encryption key |
| `GMAIL_CLIENT_ID` | Google OAuth App Client ID |
| `GMAIL_CLIENT_SECRET` | Google OAuth App Client Secret |
| `GMAIL_REFRESH_TOKEN` | OAuth Refresh Token for email access |
| `GMAIL_ACCOUNT` | Gmail account address to monitor |
| `AI_API_KEY` | OpenAI / Anthropic API key |
| `ERP_HOST` | Tally Prime host |
| `ERP_COMPANY_NAME` | Tally company name |

## Optional Secrets

| Variable | Description |
|---|---|
| `SENTRY_DSN` | Sentry error tracking DSN |
| `WEBHOOK_SECRET` | Shared secret for webhook HMAC validation |
| `S3_BUCKET` | S3 bucket for DB backups |

---

## Kubernetes Secret Management

```yaml
# Create secrets in K8s
kubectl create secret generic tallyme-secrets \
  --from-literal=DATABASE_URL="postgres://..." \
  --from-literal=JWT_SECRET="..." \
  --from-literal=ENCRYPTION_KEY="..." \
  --namespace=tallyme
```

Secrets are mounted into pods via `secretKeyRef` in `k8s/deployment.yaml`.

---

## Secret Rotation

### JWT Secret Rotation
1. Generate new `JWT_SECRET`.
2. Update the K8s secret: `kubectl patch secret tallyme-secrets ...`
3. Trigger rolling restart: `kubectl rollout restart deployment/tallyme-api`
4. Existing valid tokens will fail after rotation — users must re-login.

### Encryption Key Rotation
> ⚠️ This requires a data migration. Run encryption migration script before deploying.

### Gmail OAuth Refresh Token Rotation
1. Revoke old token in Google Cloud Console.
2. Generate new token via `/api/v1/gmail/connect` OAuth flow.
3. Update `GMAIL_REFRESH_TOKEN` secret.

---

## What To Never Do

- ❌ Never commit `.env` files with real values to Git
- ❌ Never log secrets in `console.log` or structured logs
- ❌ Never return secrets in API responses
- ❌ Never store raw secrets in the database without encryption
