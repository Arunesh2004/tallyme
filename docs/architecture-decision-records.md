# Architecture Decision Records (ADR)

## ADR 001: Modular Monolith Architecture
**Status:** Approved  
**Context:** TallyMe requires clear domain boundaries but deploying independent microservices for every module introduces excessive operational complexity and latency.  
**Decision:** We will use a Modular Monolith architecture.  
**Alternatives Considered:** Microservices, traditional layered monolith.  
**Reasoning:** Provides the strict boundaries of microservices (via interfaces and events) while retaining the deployment simplicity of a monolith.  
**Consequences:** Requires strict discipline to avoid cross-domain database joins.  
**Future Considerations:** Can be refactored into microservices if scaling demands.

## ADR 002: Separation of Document Intelligence and Accounting Intelligence
**Status:** Approved  
**Context:** AI document extraction and Tally accounting rules are distinct domains. Mixing them causes brittle logic.  
**Decision:** Document Intelligence outputs a canonical `BusinessDocument`. Accounting Intelligence consumes this to produce a `VoucherDraft`.  
**Alternatives Considered:** A single AI prompt extracting facts and deciding Tally ledgers simultaneously.  
**Reasoning:** LLMs hallucinate less when restricted to extraction. Hardcoded deterministic rules are better for ledger mapping.  
**Consequences:** Requires two distinct processing queues.

## ADR 003: Human Approval Before Tally Synchronization
**Status:** Approved  
**Context:** Pushing AI-generated transactions directly to Tally Prime poses severe compliance and audit risks.  
**Decision:** All `VoucherDrafts` must pass through the Approval Workflow state machine and reach the `APPROVED` state before syncing.  
**Alternatives Considered:** Auto-syncing high-confidence vouchers.  
**Reasoning:** Tally is the ultimate source of truth; bad data corruption is unacceptable.  
**Consequences:** Requires building a robust UI for accountants to review drafts.

## ADR 004: Event-Driven Communication with Outbox Pattern
**Status:** Approved  
**Context:** Modules must remain decoupled. Direct API calls between modules risk cascading failures.  
**Decision:** Domain events will be published using the Transactional Outbox Pattern to a message broker.  
**Alternatives Considered:** Direct REST calls, dual-writes to DB and Broker.  
**Reasoning:** Guarantees at-least-once delivery and prevents data inconsistencies if the broker is temporarily unavailable.  
**Consequences:** Requires dedicated background publishers and idempotent event consumers.

## ADR 005: Multi-Tenant Architecture with Row-Level Security (RLS)
**Status:** Approved  
**Context:** TallyMe serves multiple schools (organizations). Data leakage between schools is a catastrophic security failure.  
**Decision:** Single shared PostgreSQL database utilizing Row-Level Security (RLS) policies keyed on `OrganizationId`.  
**Alternatives Considered:** Database-per-tenant, schema-per-tenant.  
**Reasoning:** Lowest infrastructure cost and complexity while providing strong database-enforced isolation.  
**Consequences:** Connection pooling requires careful session variable management.
