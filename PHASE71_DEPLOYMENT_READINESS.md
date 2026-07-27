# Phase 71: Tally Master & Deployment Readiness Audit

## 1. Required Environment Variables
The following environment variables must be configured for a production deployment:

### Backend Services
- \`DATABASE_URL\`: PostgreSQL connection string.
- \`REDIS_URL\`: Redis connection string (for BullMQ queues).
- \`WORKER_MODE\`: Must be \`true\` for worker nodes processing background tasks.

### AI & OCR Integration
- \`AI_PROVIDER\`: e.g., \`gemini\`
- \`AI_API_KEY\`: Required for Gemini-based OCR and Intelligence Extraction.
- \`AI_MODEL\`: e.g., \`models/gemini-flash-lite-latest\`
- \`AZURE_OCR_ENDPOINT\` & \`AZURE_OCR_KEY\`: (Optional) Required if using Azure Document Intelligence.
- \`OCR_PROVIDER\`: e.g., \`gemini\` or \`azure\`

### ERP (Tally Prime) Integration
- \`TALLY_HOST\`: e.g., \`http://localhost\` or the school's internal network IP.
- \`TALLY_PORT\`: e.g., \`9000\`
- \`TALLY_COMPANY_NAME\`: The exact name of the company in Tally Prime.

### Ingestion (Optional)
- \`IMAP_HOST\`, \`IMAP_USER\`, \`IMAP_PASSWORD\`: Required for automated email invoice/receipt ingestion.

---

## 2. Required Tally Masters
TallyMe's \`TallyMasterValidationEngine\` strictly enforces the existence of certain masters in Tally before a voucher is sent.

**Explicitly Validated by TallyMe (Must exist in Tally Discovery Report):**
- **Vendor Ledger / Party Ledger**: Required for the credit leg of vendor invoices.
- **Expense / Purchase Ledger**: Required for the debit leg of line items.
- **Tax / GST Ledger**: Required if the invoice contains tax components.

**Implicitly Required by Tally (Tally will reject the XML if missing):**
- **Voucher Type**: e.g., 'Purchase', 'Receipt', 'Journal'. 

---

## 3. Optional Integrations
- Azure Document Intelligence (for higher accuracy OCR on complex tables).
- Gmail/IMAP Watch Service (for zero-touch email invoice uploads).
- Slack/Teams Webhooks (if implemented for manual review notifications).

---

## 4. First-Time Deployment Checklist
> [!IMPORTANT]
> A completely new school CANNOT simply deploy and start uploading invoices. TallyMe requires a manual or automated Master Sync before processing.

- [ ] Deploy PostgreSQL and Redis infrastructure.
- [ ] Deploy TallyMe Backend and Frontend.
- [ ] Configure Tally Prime to accept HTTP requests on the designated port.
- [ ] Create all necessary foundational Ledgers in Tally (Purchase Account, Default Vendor Groups).
- [ ] Run the **Tally Discovery Sync** to populate the \`TallyDiscoveryReport\` in TallyMe's database.
- [ ] Configure the \`LedgerMappingConfiguration\` in TallyMe to map invoice categories to Tally Expense Ledgers.

---

## 5. First Invoice Checklist
- [ ] Verify the Vendor exists in Tally and is synced to TallyMe.
- [ ] Verify the Expense Ledger for the invoice exists in Tally and is mapped.
- [ ] Verify the Tax Ledgers exist.
- [ ] Upload the invoice and monitor the `vendor-slip-queue`.
- [ ] Verify the voucher candidate reaches `SYNC_PENDING` and is dispatched to Tally.

---

## 6. First Student Payment Checklist
- [ ] Verify Student Ledgers exist in Tally (or are mapped to a generic Debtors ledger).
- [ ] Verify Fee/Income Ledgers exist and are synced.
- [ ] Verify Bank/Cash Receipt Ledgers exist.
- [ ] Upload the bank statement or receipt and monitor the workflow.

---

## 7. Common Failure Reasons
- **Missing Tally Masters**: The \`TallyMasterValidationEngine\` rejects the voucher because a required ledger is not found in the latest \`TallyDiscoveryReport\`.
- **Ledger Mapping Failure**: \`LedgerMappingEngine.resolveExpenseLedger\` returns \`UNKNOWN_LEDGER\` because \`LedgerMappingConfiguration\` is missing or incomplete, causing the pipeline to abort before voucher generation.
- **Tally Connection Refused**: The Tally Prime instance is closed, the company is not loaded, or the HTTP port is blocked by a firewall.
- **AI/OCR Timeout**: The Gemini or Azure API times out due to network restrictions or invalid keys.

---

## 8. Recovery Procedure
- **Master Sync Failures**: Manually trigger a Tally Discovery sync from the TallyMe dashboard, then retry the failed job.
- **Missing Ledger**: Create the ledger in Tally Prime manually, run the Discovery Sync, and retry the \`ERPSyncJob\`.
- **Validation Rejection**: Use the Manual Review UI to map the unrecognized vendor or expense to an existing Tally ledger, then approve the candidate.

---

## 9. Health Checks
- Tally Connector Health: Verifies Tally is reachable and the correct company is open.
- Queue Health: Verifies BullMQ Redis connection and worker heartbeat.
- AI Provider Health: Verifies API keys are valid and quotas are not exceeded.
- Database Health: Verifies Prisma can connect to PostgreSQL.

---

## 10. Go-Live Checklist
- [ ] Infrastructure provisioned and secured.
- [ ] Environment variables injected.
- [ ] Tally Prime HTTP server enabled and tested via `curl`.
- [ ] Initial Tally Discovery Report successfully generated.
- [ ] Default Ledger Mapping rules configured.
- [ ] End-to-end UAT completed with a test invoice and test receipt.
- [ ] Workers started with \`WORKER_MODE=true\`.
