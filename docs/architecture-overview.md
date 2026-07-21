# Architecture Overview

## High-Level Architecture
TallyMe is architected as an Event-Driven Modular Monolith, bridging modern AI Document Understanding with legacy Tally Prime ERP systems. The platform strictly enforces near real-time synchronization with Tally Prime, ensuring that Tally remains the absolute source of truth.

## Domain Boundaries
The platform is segregated into distinct vertical slices to maximize cohesion and minimize coupling:

1. **Mail Intelligence Domain:** Handles secure ingestion of vendor bills via IMAP/OAuth.
2. **Vendor Bill Intelligence Domain:** Handles manual multi-format ingestion (PDF, TIFF, Excel).
3. **AI Document Intelligence Domain:** Orchestrates OCR, extraction, and validation.
4. **Accounting Intelligence Domain:** Generates Tally-specific voucher drafts and ledger mappings.
5. **Approval Workflow Domain:** Manages the human-in-the-loop lifecycle.
6. **Tally Sync Engine:** The dedicated bounded context for bi-directional XML/JSON synchronization with Tally Prime.

## Request Flow
1. **Ingestion:** Documents arrive via Mail Worker polling or direct API upload.
2. **Orchestration:** An asynchronous `DocumentUploaded` event is emitted.
3. **AI Pipeline:** The AI Worker picks up the event, executes OCR, classifies the document, and extracts line items to form a `BusinessDocument`.
4. **Accounting Transformation:** The Accounting Intelligence domain maps the generic `BusinessDocument` into a `VoucherDraft`.
5. **Approval:** The Accountant reviews the draft via the Web UI and approves it.
6. **Synchronization:** A `VoucherSynced` command is queued for the Sync Worker, which pushes the transaction to Tally Prime.

## Background Workers
Background processing is critical to decouple slow operations (OCR, LLM extraction) from the web layer. Workers scale horizontally and rely on Dead Letter Queues (DLQ) for resilience.

## Future Migration Path
While deployed as a Modular Monolith initially to reduce operational overhead, the strict domain isolation via interfaces and event-driven communication (instead of direct DB joins) guarantees a seamless migration path to independent microservices if scaling demands it (e.g., extracting the AI pipeline into a standalone service).
