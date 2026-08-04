# Phase C API Contract

## 1. Analytics & Dashboard APIs

### `GET /api/v1/vmms/analytics/summary`
Retrieves aggregated statistics for the VMMS shadow pipeline over a given time window.
- **Query Params:** `startDate` (ISO), `endDate` (ISO), `companyId` (UUID)
- **Response:**
  ```json
  {
    "totalInvoices": 15000,
    "legacyMatches": 12500,
    "vmmsMatches": 13000,
    "agreementRate": 98.5,
    "disagreementRate": 1.5,
    "stage1MatchRate": 60.0,
    "stage2MatchRate": 30.0,
    "noMatchRate": 10.0,
    "averageLatencyMs": 12.4,
    "p95LatencyMs": 28.1,
    "shadowFailures": 5,
    "dualWriteRate": 100.0
  }
  ```

### `GET /api/v1/vmms/analytics/mismatches`
Retrieves a paginated list of invoices where legacy routing diverged from VMMS routing.
- **Query Params:** `page`, `limit`, `companyId`
- **Response:**
  ```json
  {
    "data": [
      {
        "invoiceId": "uuid-123",
        "invoiceNumber": "INV-100",
        "legacyVendorName": "Acme Corp",
        "vmmsVendorName": "Acme Inc Pvt Ltd",
        "confidenceDelta": 15.5,
        "reasonCode": "GSTIN_NORMALIZATION_DIFFERENCE",
        "timestamp": "2026-07-30T00:00:00Z"
      }
    ],
    "meta": { "total": 142, "page": 1, "limit": 10 }
  }
  ```

## 2. Replay & Simulation APIs

### `POST /api/v1/vmms/replay`
Executes the VMMS Matcher against a specific historical invoice to simulate how the *current* codebase would behave without modifying production data.
- **Request Body:**
  ```json
  {
    "invoiceCandidateId": "uuid-123"
  }
  ```
- **Response:**
  ```json
  {
    "invoiceCandidateId": "uuid-123",
    "simulatedDecision": {
      "stage": "STAGE_1_EXACT_GSTIN",
      "vendorLedgerId": "uuid-456",
      "confidence": 100
    },
    "originalDecision": {
      "stage": "STAGE_2_NORMALIZED_GSTIN",
      "vendorLedgerId": "uuid-456",
      "confidence": 85
    },
    "diffStatus": "IMPROVED"
  }
  ```

## 3. Administrative Action APIs

### `POST /api/v1/vmms/admin/resolve-mismatch`
Records a human auditor's verdict on a mismatch.
- **Request Body:**
  ```json
  {
    "invoiceId": "uuid-123",
    "verdict": "VMMS_CORRECT",
    "notes": "Legacy incorrectly matched on partial name 'Tech'. VMMS correctly isolated via GSTIN."
  }
  ```
- **Response:** `200 OK`

### `POST /api/v1/vmms/admin/create-alias`
Promotes a failed routing attempt into a deterministic rule (`VendorAlias`).
- **Request Body:**
  ```json
  {
    "vendorLedgerId": "uuid-456",
    "aliasText": "ACME CORP PVT LTD",
    "invoiceIdContext": "uuid-123"
  }
  ```
- **Response:** `201 Created` with new `VendorAlias` payload.

## 4. Error Specifications
Standard HTTP conventions apply.
- `400 Bad Request`: Invalid pagination or missing query parameters.
- `404 Not Found`: Attempting to replay an `InvoiceCandidate` that does not exist.
- `422 Unprocessable Entity`: Attempting to resolve a mismatch that has already been resolved or creating an alias that already exists.
