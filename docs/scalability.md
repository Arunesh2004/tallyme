# Scalability & Performance Architecture

## Overview
TallyMe is designed to scale dynamically from a handful of small schools (100 users) to large educational trusts (1,000+ users, 10,000+ invoices/day, 100,000+ emails/day). The architecture leverages horizontal scaling, aggressive caching, and robust queue management to meet strict performance budgets.

## Target Capacities & Scaling Vectors

### Web & API Tier (Horizontal Scaling)
- **Strategy:** Stateless Node.js / Go containers running in a Kubernetes cluster or serverless environment. 
- **Trigger:** Auto-scales based on CPU utilization (target 70%) and incoming HTTP request volume.

### Background Workers & Queue Scaling
Handling 10,000 invoices and 100,000 emails daily requires massive asynchronous throughput.
- **Strategy:** Worker deployments auto-scale based on **queue depth** rather than CPU. If the `document-intelligence-queue` backs up due to LLM latency, the orchestrator provisions additional AI Workers.
- **Constraints:** Scaling AI Workers must respect external third-party API rate limits (e.g., OpenAI/Anthropic RPM limits) to prevent cascading 429 errors.

### Database Scaling
- **Strategy:** Vertical scaling for the primary write node initially. To handle heavy dashboard aggregations and audit log queries, asynchronous **Read Replicas** are provisioned.
- **Connection Pooling:** PgBouncer ensures the database isn't overwhelmed by max connection limits during worker spike scaling.

### Storage Scaling
- S3 / Blob Storage is inherently infinitely scalable. Lifecycle policies automatically transition documents older than 7 years (compliance minimum) to Glacier/Cold storage to optimize costs.

## Caching Strategy
- **Master Data:** Tally Master mappings (Ledgers, Vendors, Cost Centres) are highly requested and rarely change. They are aggressively cached in Redis for fast access by the Accounting Intelligence module. Cache invalidates upon `MasterSyncCompleted` events.

## Observability & Performance Targets
- **Availability:** Target 99.9% uptime.
- **Metrics & Tracing:** Prometheus for metrics (Queue Latency, OCR Duration, API Error Rates). Jaeger/OpenTelemetry for distributed tracing across the event bus.
- **Performance Budgets:**
  - API p95 response time < 300ms.
  - Email Ingestion to Draft Creation < 45 seconds (p95).
  - Tally Sync Acknowledgement < 5 seconds.

## Future Microservice Migration Strategy
Because TallyMe is structured as a Modular Monolith with strict domain boundaries and event-driven integration, individual domains can be carved out into independent microservices with zero architectural redesign. For example, if OCR workloads interfere with web performance, the entire Document Intelligence module can be deployed as an isolated service communicating strictly via RabbitMQ/Kafka.

## Related Documents
- `background-workers.md`
- `architecture-overview.md`
