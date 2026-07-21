# Document Intelligence Subsystem

## Overview
The Document Intelligence module is the brain of the extraction pipeline. It subscribes to `DocumentUploaded` events from either Mail Intelligence or Vendor Bill Intelligence. Its **sole responsibility** is to convert unstructured pixels/binaries into a structured, canonical `BusinessDocument` entity. 

**Strict Boundary:** This module makes ZERO accounting decisions (no ledgers, no cost centres). It only interprets what is physically printed on the document.

## Pipeline Stages

### 1. Document Ingestion
- **Purpose:** Fetch the raw binary from S3 using the URI provided in the event payload.
- **Inputs:** `DocumentUploaded` event payload.
- **Outputs:** In-memory binary buffer or standardized PDF structure.
- **Failure Modes:** S3 timeout, Access Denied.
- **Retry Policy:** Exponential backoff (max 3 attempts).

### 2. OCR (Optical Character Recognition)
- **Purpose:** Extract raw text blocks, coordinates, and layout data.
- **Inputs:** Binary document.
- **Outputs:** JSON layout tree (text, bounding boxes).
- **Failure Modes:** Unreadable DPI, corrupted image, password-protected PDF.
- **Human Intervention:** Fails to `NEEDS_REVIEW` if OCR confidence < 80%.

### 3. Document Classification
- **Purpose:** Determine document type (e.g., Tax Invoice, Credit Note).
- **Inputs:** OCR text output.
- **Outputs:** Enum `DocumentType`.
- **Validation:** Must match supported enum types.

### 4. Entity Extraction (LLM / NLP)
- **Purpose:** Extract key-value pairs (Invoice Date, Invoice Number, Totals).
- **Inputs:** OCR text, `DocumentType`.
- **Outputs:** Structured JSON payload.
- **Validation:** Data type enforcement (e.g., Date parses to ISO8601).
- **Hallucination Mitigation:** LLM outputs are strictly constrained by JSON schema. Fields must physically exist in OCR bounding boxes (grounding).

### 5. GST Extraction & Validation
- **Purpose:** Identify CGST, SGST, IGST, and Vendor GSTIN.
- **Outputs:** Tax breakdown arrays.
- **Validation:** Mathematical checksum (Taxable Value + GST = Total). If math fails, confidence score is heavily penalized.

### 6. Vendor Detection
- **Purpose:** Identify the specific vendor issuing the bill.
- **Outputs:** `VendorName`, `GSTIN`, `Address`.
- **Validation:** Cross-referenced against the `Vendors` table. If no exact match is found (or multiple fuzzy matches exist), the pipeline outputs `VendorMatchConfidence`.

### 7. Table & Line Item Extraction
- **Purpose:** Extract individual products/services billed.
- **Outputs:** Array of `LineItems` (Description, Qty, Rate, Amount).
- **Validation:** Sum of line items must match the extracted Subtotal.

### 8. Confidence Scoring & Finalization
- **Purpose:** Aggregate confidence metrics from OCR, Math validation, and LLM entropy.
- **Outputs:** A final `OverallConfidenceScore` (0-100).
- **Human Review Criteria:** If score < 95, or if Math Validation fails, the document is flagged for mandatory human review.
- **Final Output:** A canonical `BusinessDocument` record is inserted into the database. 

## Handoff to Accounting Intelligence
The pipeline concludes by publishing a `DocumentExtractionCompleted` event, containing the ID of the newly created `BusinessDocument`. The Accounting Intelligence module will subsequently pick this up to generate a Tally Voucher Draft.
