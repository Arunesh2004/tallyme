# Vendor Bill Intelligence Subsystem

## Overview
The Vendor Bill Intelligence module handles the manual and programmatic (API) ingestion of financial documents by accountants and school administrators. It acts as the gateway for all documents that do not arrive via the automated Mail Intelligence pipeline.

## Supported Formats
The ingestion endpoint accepts:
- **Documents:** PDF (Text and Scanned)
- **Images:** JPEG, PNG, TIFF
- **Spreadsheets:** XLSX, CSV (often used for bulk fee structures or multi-line POs)

## Document Classification
While deeper classification happens in the AI pipeline, this module must perform high-level validation to accept or reject formats based on organizational policies. Supported business intents include:
- Purchase Orders
- Credit Notes
- Debit Notes
- Delivery Challans
- Tax Invoices

## Upload Lifecycle & Validation Pipeline
1. **API Gateway:** The UI posts a multipart/form-data request to `/api/documents/upload`.
2. **Synchronous Validation:** Verifies file size (< 25MB), MIME type, and malware scanning (streamed via ClamAV).
3. **Storage Strategy:** The file is streamed directly to secure Object Storage (AWS S3 / Azure Blob) into a `raw-ingestion` bucket. A temporary signed URL is generated.
4. **Database Record:** A `Document` entity is created with state `UPLOADED`.
5. **Duplicate Detection:** A SHA-256 hash of the binary stream is calculated. If a match exists in the tenant's database, the upload is flagged as `DUPLICATE` and halted.

## Handoff to Document Intelligence
Once stored and validated, the module publishes a `DocumentUploaded` event onto the event bus. The payload includes:
- `DocumentId`
- `StorageURI`
- `TenantId`
- `UploadedBy` (User ID for audit trails)

At this point, the Vendor Bill module's responsibility ends, delegating the heavy lifting to the OCR and AI components.

## Resilience & Background Workers
- **Queue Architecture:** Uploads are fundamentally synchronous up to the S3 put, but processing is entirely asynchronous.
- **Retry Strategy:** If the S3 upload fails, the UI receives an immediate 5xx/4xx error. If the event bus is down, the outbox pattern ensures the `DocumentUploaded` event is eventually published.
- **Events Emitted:** `DocumentUploaded`, `UploadFailed`.
