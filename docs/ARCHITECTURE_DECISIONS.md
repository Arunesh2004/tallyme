# TallyMe Enterprise
# Architecture Decision Records (ADR)

This document complements PRODUCT_CONSTITUTION.md. 
While PRODUCT_CONSTITUTION.md defines WHAT the product is and its governing architectural rules, this document explains WHY those architectural decisions were made. Future contributors should read both documents in their entirety before proposing or making any architectural changes.

## ADR-001
### Shared Accounting Engine

### Status
Accepted

### Decision
Both Vendor Slip Automation and Student Fee Automation converge into one Shared Accounting Engine.

### Context
TallyMe Enterprise handles distinct incoming data sources: unstructured vendor invoices (OCR extraction) and structured student fee emails (Gmail API). However, regardless of the input format, both processes ultimately result in the creation of a financial voucher in the underlying ERP (Tally Prime).

### Rationale
- **Single Source of Accounting Truth:** Funneling all accounting activity through a central engine ensures uniform compliance, consistent ledger structures, and single-point orchestration for financial data.
- **Reusable Accounting Logic:** Validations for duplication, currency conversions, and ledger assignments can be centrally managed.
- **Easier Maintenance:** Adjustments to ERP connections or voucher structures only need to be applied in one place.
- **Consistent Voucher Generation:** Guaranteeing that all vouchers—whether receipts or journals—adhere to the exact same generation pipeline prevents data fragmentation.

### Alternatives Considered
- **Separate Accounting Engines:** We considered building a dedicated pipeline for Vendor slips and a separate pipeline for Student fees directly communicating with Tally.
- **Independent Pipelines:** Allowing each workflow to manage its own XML building and HTTP transmission.

### Trade-offs
The selected approach introduces a hard dependency on the Shared Accounting Engine, meaning a failure in this module halts all workflows. However, this is acceptable because ERP synchronization relies on a single ERP instance anyway.

### Consequences
Rejected separate pipelines because they inevitably lead to duplicated retry logic, fragmented observability, and divergence in XML generation over time, increasing long-term technical debt exponentially.

### Future Considerations
Any future business workflow (e.g., Payroll Automation) must also converge into this Shared Engine.

---

## ADR-002
### VoucherCandidate Pattern

### Status
Accepted

### Decision
All upstream business workflows transform their domain-specific extractions into a unified VoucherCandidate object before accounting processing.

### Context
A Vendor Invoice and a Student Fee Receipt have drastically different data structures, validation requirements, and source metadata. Passing these raw domain objects into an accounting engine creates high coupling.

### Rationale
- **Standardization:** The engine expects a uniform shape. The VoucherCandidate serves as an anti-corruption layer.
- **Validation:** Pre-flight checks can be standardized across all candidate objects, rejecting malformed data before queuing.
- **Extensibility:** New data sources simply need an adapter to transform into a VoucherCandidate.
- **Decoupling:** Business workflows (like matching or OCR) remain entirely oblivious to accounting mechanics, while the accounting engine remains oblivious to how the data was captured.

### Alternatives Considered
Passing raw parsed DTOs straight to the accounting engine.

### Trade-offs
Requires an explicit transformation step and mapping layer, slightly increasing initial development time.

### Consequences
Rejected direct mapping as it tightly couples domain-specific fields to generic accounting logic.

### Future Considerations
The VoucherCandidate interface must remain strictly agnostic to its origins.

---

## ADR-003
### BullMQ as the Asynchronous Backbone

### Status
Accepted

### Decision
All accounting and ERP synchronization operations must execute asynchronously via BullMQ on top of Redis.

### Context
Communicating with legacy ERPs like Tally Prime over HTTP can be slow, intermittent, or prone to sudden timeouts. Synchronous HTTP requests handling these operations will lead to memory leaks, connection starvation, and poor UX.

### Rationale
- **Retry Handling:** BullMQ provides robust, out-of-the-box exponential backoff, handling ERP network hiccups without custom retry loops.
- **Scalability:** Worker nodes can be scaled horizontally and independently of the API web servers (WORKER_MODE=true).
- **Fault Tolerance:** If Redis disconnects, the workers gracefully stall (maxRetriesPerRequest: null) rather than crashing, ensuring zero data loss.
- **Queue Isolation:** Distinct queues (e.g., OCR processing vs. ERP synchronization) prevent noisy-neighbor problems where slow ERP inserts block invoice parsing.

### Alternatives Considered
- In-memory event emitters (@nestjs/event-emitter).
- RabbitMQ or Kafka.

### Trade-offs
Requires managing a Redis instance in production, adding infrastructural footprint.

### Consequences
In-memory emitters were rejected due to lack of persistence (data loss on crash). Kafka was rejected as overkill for linear queuing requirements.

### Future Considerations
Monitor Redis memory consumption and evict completed/failed jobs via BullMQ TTL settings.

---

## ADR-004
### ERP Connector Abstraction

### Status
Accepted

### Decision
No business module or workflow may communicate directly with Tally Prime. All communication passes strictly through the ERP Connector module.

### Context
Tally Prime requires a specific, archaic XML payload over HTTP. Hardcoding this HTTP behavior into the Shared Accounting Engine would tightly couple the application to Tally.

### Rationale
- **Future ERP Replacement:** The architecture allows swapping Tally Prime for another ERP (e.g., SAP, Oracle) by simply swapping the connector implementation, keeping business logic intact.
- **Testing:** The ERP Connector can be easily mocked in integration tests.
- **Isolation:** Network timeouts, ERP restarts, and connection pooling are strictly contained within the connector boundary.
- **Maintainability:** Changes to Tally's schema impact exactly one module.

### Alternatives Considered
Directly firing HTTP requests from the BullMQ consumer.

### Trade-offs
Introduces an abstraction layer that must be maintained.

### Consequences
Direct communication rejected to preserve Separation of Concerns (SoC).

### Future Considerations
Ensure the Connector interface remains generic enough to support REST/JSON ERPs in the future.

---

## ADR-005
### Centralized Tally XML Builder

### Status
Accepted

### Decision
Tally XML generation exists in exactly one place (Tally XML Builder), encapsulated within the ERP Connector.

### Context
Generating Tally XML requires strict adherence to legacy formatting, specific date formats, and precise tag hierarchies. 

### Rationale
- **Consistency:** Prevents edge cases where one workflow formats dates differently than another.
- **Versioning:** Allows seamless upgrades if Tally introduces new XML specifications.
- **Testing:** A centralized builder can be unit-tested exhaustively without network dependencies.
- **Reduced Duplication:** Eliminates the need to maintain XML boilerplate in multiple feature branches.

### Alternatives Considered
Generating XML directly within the workflow orchestrators before queuing.

### Trade-offs
The central builder becomes a complex monolith of XML generation logic.

### Consequences
Rejected workflow-level generation because it violates the anti-corruption layer pattern and leaks infrastructure details into the business domain.

### Future Considerations
As more voucher types are supported (e.g., Payments, Contra), the builder should implement a Strategy pattern to manage complexity.

---

## ADR-006
### Exactly Two Core Business Workflows

### Status
Accepted

### Decision
The product scope is intentionally limited to exactly two core workflows: Vendor Slip Automation and Student Fee Automation.

### Context
Enterprise software frequently suffers from scope creep, leading to bloated architectures and unmaintainable codebases. TallyMe Enterprise focuses purely on automating the highest-volume financial bottlenecks.

### Rationale
- These two flows represent the primary business value for our target demographic (educational institutions and mid-sized enterprises).
- By limiting scope, we can harden the Shared Accounting Engine and ensure unparalleled reliability.
- Future features (if strictly necessary) must integrate into the Shared Accounting Engine rather than introducing independent accounting systems.

### Alternatives Considered
Building a generic "Any Document to Tally" pipeline.

### Trade-offs
Sacrifices broad market appeal for deep, reliable specialization in two key domains.

### Consequences
Generic pipelines were rejected as they require overly complex mapping configurations that ultimately frustrate end-users and decrease accuracy.

### Future Considerations
Any deviation from these two workflows requires an explicit amendment to PRODUCT_CONSTITUTION.md.

---

## ADR-007
### Manual Review Queue

### Status
Accepted

### Decision
The system supports a hybrid processing model: automatic processing combined with an enforced human review queue for exceptions.

### Context
OCR extraction and automated student matching will never achieve 100% accuracy. Financial systems have zero tolerance for incorrect accounting entries.

### Rationale
- **Confidence Thresholds:** Documents parsing below a strict confidence threshold bypass automatic queuing and pause for human validation.
- **Exception Handling:** Unrecognized vendors or unmatched students are cleanly routed to operators.
- **Auditability:** Human interactions in the review queue are logged, providing a clear chain of custody before the voucher is approved.

### Alternatives Considered
Fully automated straight-through processing (STP) with failure drops.

### Trade-offs
Requires building and maintaining frontend UI for the manual review portal.

### Consequences
Fully automated STP was rejected because dropping financial records leads to silent reconciliation failures at month-end.

### Future Considerations
Introduce machine learning feedback loops where manual corrections train the extraction models.

---

## ADR-008
### Observability First

### Status
Accepted

### Decision
The system is built with structured logging, correlation IDs, Prometheus metrics, comprehensive health endpoints, queue monitoring, and provider status tracking.

### Context
When a voucher fails to appear in Tally, enterprise operators need to know exactly where the pipeline failed (e.g., Email Fetch, OCR, Queue, or ERP Network). 

### Rationale
- Enterprise accounting systems require complete traceability.
- **Structured Logging:** 
estjs-pino outputs JSON, allowing ingestion into Datadog/ELK.
- **Correlation IDs:** A single ID traces a payload from the Gmail webhook all the way to the Tally HTTP response.
- **Prometheus Metrics:** Exposes queue depth and failure rates natively for Grafana dashboards.

### Alternatives Considered
Standard console logging.

### Trade-offs
Slight performance overhead from telemetry collection.

### Consequences
Standard console logging rejected due to the impossibility of debugging asynchronous, distributed micro-workflows in production environments.

### Future Considerations
Implement OpenTelemetry distributed tracing if the architecture evolves into discrete microservices.

---

## ADR-009
### Idempotency and Duplicate Protection

### Status
Accepted

### Decision
Duplicate invoices, duplicate fee payments, and duplicate ERP submissions must be deterministically blocked from creating duplicate accounting entries.

### Context
Network retries (e.g., BullMQ resending a payload to Tally after a timeout) can result in double-booking if the ERP processed the first request but failed to return a response.

### Rationale
- **Business Impact:** Double-booking expenses destroys financial integrity and creates massive manual reconciliation headaches.
- **Financial Integrity:** Relying on hashes and unique transaction IDs (UTR) ensures each real-world event maps to exactly one ERP event.
- **Audit Compliance:** Explicit idempotency guarantees are required for financial software certification.

### Alternatives Considered
Relying on Tally Prime's internal deduplication.

### Trade-offs
Requires maintaining idempotency keys and state in PostgreSQL/Redis before transmission.

### Consequences
Rejected relying on Tally as legacy ERPs often lack robust, native idempotency guarantees for generic journal entries.

### Future Considerations
Idempotency keys should have a defined TTL in Redis to prevent memory exhaustion over years of operation.

---

## ADR-010
### Architecture Governance

### Status
Accepted

### Decision
PRODUCT_CONSTITUTION.md is the absolute governing architectural document. ARCHITECTURE_DECISIONS.md explains the reasoning. 

### Context
To prevent architectural drift as new engineers and AI agents contribute to the codebase, strict governance must be codified.

### Rationale
- Any future architectural changes must document a new ADR in this file.
- The new ADR must explicitly explain why the previous decision is no longer appropriate.
- Changes must preserve backward compatibility whenever possible.

### Alternatives Considered
Implicit architecture through tribal knowledge and code review alone.

### Trade-offs
Adds friction to the development process.

### Consequences
Implicit governance rejected as it inevitably leads to the erosion of the Shared Accounting Engine concept.

### Future Considerations
Automate checks in CI/CD to prompt developers to update ADRs when modifying core engine interfaces.

---

# Architectural Principles

The permanent engineering philosophy of TallyMe Enterprise is built upon the following non-negotiable principles:

- **Exactly Two Core Business Workflows:** Vendor Slip Automation and Student Fee Automation.
- **Shared Accounting Engine:** All workflows converge here.
- **Single Accounting Pipeline:** No parallel or bypassing financial data flows.
- **Asynchronous Processing:** Accounting execution is deferred via queues.
- **ERP Abstraction:** Business logic never speaks HTTP to legacy systems.
- **Centralized Voucher Generation:** One XML builder to rule them all.
- **High Observability:** If it can fail, it must be logged and metered.
- **Strong Idempotency:** Double-booking is a critical system failure.
- **Production-First Engineering:** Chaos resilience and security over rapid prototyping.
- **Architecture over Feature Duplication:** Preserve the engine; do not reinvent it.
