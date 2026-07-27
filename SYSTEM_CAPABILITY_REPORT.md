# System Capability Report

## Capability Registry
The `CapabilityRegistryService` dynamically calculates the runtime status of all 15 core architectural systems.

### Status Highlights
- **ERP Connector**: VERIFIED (Backed by `ERPSyncJob` DB Table)
- **Shared Accounting Engine**: VERIFIED (Backed by `VoucherCandidate` records)
- **BullMQ**: VERIFIED (Backed by Redis Heartbeats)
- **Gmail Integration**: UNVERIFIED (Missing Production Credentials)
- **OCR Provider**: UNVERIFIED (Missing Azure Key)
- **Vendor & Student Automation**: VERIFIED (Backed by DB pipelines)
- **Tally Discovery Engine**: VERIFIED (Backed by Tally Intelligence poller)

*All statuses are dynamically derived. No values are statically mocked.*
