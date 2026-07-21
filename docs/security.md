# Security Architecture

## Overview
TallyMe handles highly sensitive financial data, vendor invoices, and ERP connectivity credentials. The security architecture is designed to meet strict enterprise compliance standards, emphasizing Zero Trust, multi-tenant isolation, and immutable auditability.

## Identity & Access Management

### Authentication & Sessions
- **Strategy:** Stateless JWT (JSON Web Tokens) for API authorization, coupled with secure, HttpOnly, SameSite=Strict cookies for web sessions.
- **Refresh Tokens:** Short-lived access tokens (15m) and long-lived refresh tokens (7d) stored securely with rotation enabled.
- **Password Policy:** Minimum 12 characters, enforced complexity, bcrypt hashing (work factor 12).

### Authorization & RBAC
- **Multi-Tenancy:** The foundational security layer. Every API request must pass through an authorization middleware that validates the user's `OrganizationId` against the requested resource.
- **Roles:**
  - `Admin`: Full access, settings management, user management.
  - `Senior Accountant`: Can approve vouchers above dynamic value thresholds.
  - `Reviewer/Clerk`: Can edit drafts and upload documents, but cannot force Tally Sync.

## Data Protection

### Encryption
- **In Transit:** All communications (Web UI to API, API to Tally, API to LLM providers) are enforced over TLS 1.3.
- **At Rest:** Database volumes and S3 buckets are encrypted using AES-256 (KMS-managed keys). 
- **Secrets Management:** Sensitive configurations (e.g., Tally API endpoints, Google/Microsoft OAuth tokens) are never stored in plaintext. They are encrypted using a rotating symmetric master key managed in a secure vault (e.g., AWS Secrets Manager).

### Document & File Security
- **Malware Scanning:** All manual file uploads (Vendor Bill Intelligence) and email attachments (Mail Intelligence) are streamed through ClamAV before landing in persistent storage.
- **Document Access:** S3 objects are completely private. The API serves short-lived, pre-signed URLs (valid for 5 minutes) to the UI only after validating the user's `OrganizationId` against the requested `DocumentId`.

## Audit & Compliance
- **Audit Logging:** Every mutating API action (`POST`, `PUT`, `PATCH`, `DELETE`) is intercepted by a middleware that writes an immutable record to the `AuditLogs` table, capturing User ID, IP address, Action, and a JSON diff of the change.
- **Security Event Logging:** Failed login attempts, password resets, and permission denied errors trigger specific security alerts for SIEM ingestion.

## Resilience & Incident Response
- **Rate Limiting:** IP-based generic limits to prevent DDoS, and Tenant-based limits on heavy endpoints (like Document Upload) to prevent noisy-neighbor degradation.
- **Input Validation:** Strict parsing of all inputs using Zod schemas to mitigate SQL injection and XSS.
- **Disaster Recovery:** Automated point-in-time recovery (PITR) backups for PostgreSQL, and continuous replication for critical storage buckets.

## Related Documents
- `api-design.md`
- `database-design.md`
- `approval-workflow.md`
