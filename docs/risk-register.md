# Risk Register

| Risk ID | Description | Likelihood | Impact | Mitigation Strategy | Contingency Plan | Owner | Status |
|---------|-------------|------------|--------|---------------------|------------------|-------|--------|
| RSK-01 | **AI Hallucinations** (Incorrect Ledger Mapping) | Medium | High | Rely on explicit Math Checksums and historic DB mappings before asking LLM. | Accountant reviews draft in `NEEDS_REVIEW` and edits mapping manually. | AI Team | Open |
| RSK-02 | **Tally Prime Connectivity** (On-Premise offline) | High | High | Durable `tally-sync-queue` with exponential backoff. | `SyncWorker` holds payloads indefinitely until Tally is reachable. | Platform Team | Open |
| RSK-03 | **Duplicate Vouchers in Tally** | Low | Critical | TallyMe injects unique GUID into XML `VCHKEY`. | Tally TDL drops duplicate payload entirely. | Integration Team | Open |
| RSK-04 | **Multi-Tenant Leakage** | Low | Critical | PostgeSQL Row-Level Security (RLS) on every table. | Fallback application-level authorization middleware. | Security Team | Open |
| RSK-05 | **Ledger Master Drift** (Deleted in Tally) | Medium | Medium | TallyMe detects rejection XML from Tally during sync. | Moves payload to DLQ, triggers `MasterSyncStarted` to refresh ledgers. | Integration Team | Open |
| RSK-06 | **High AI Latency** (OpenAI/Anthropic limits) | High | Medium | Asynchronous queue-based processing. Auto-scaling workers. | Rate-limit ingestion; notify users of processing delays. | AI Team | Open |
| RSK-07 | **Email Provider Outages** (O365/Gmail down) | Low | High | Webhooks enqueue directly; Polling resumes when API recovers. | Users use Manual Vendor Bill Upload as fallback. | Platform Team | Open |
