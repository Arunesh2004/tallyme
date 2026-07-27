# TallyMe Enterprise — API Reference

## Authentication

All protected endpoints require `Authorization: Bearer <jwt>` header.

### POST /auth/login
```json
Request:  { "email": "admin@school.com", "password": "secret" }
Response: { "accessToken": "<jwt>", "user": { "id": "...", "role": "Admin" } }
Status:   200 OK | 401 Unauthorized
```

---

## Dashboard

### GET /dashboard/overview
Returns aggregated KPI metrics.
```json
Response: {
  "vendorInvoicesProcessed": 124,
  "studentPaymentsProcessed": 89,
  "voucherCount": 213,
  "erpSyncStatus": { "PENDING": 3, "SYNCED": 209, "FAILED": 1 },
  "pendingReviews": 7,
  "failedJobs": 1
}
Status: 200 OK | 401 Unauthorized
Auth: Required (any role)
```

---

## Vendor APIs

### POST /vendor-slip/upload
```
Content-Type: multipart/form-data
Field: file (PDF/JPG/PNG, max 5MB)
Response: { "documentId": "uuid", "status": "UPLOADED" }
Status: 202 Accepted | 400 Bad Request | 415 Unsupported Media Type
Auth: Required (Accountant / Admin)
```

### GET /review/vendor
```json
Response: [
  {
    "documentId": "uuid",
    "status": "MANUAL_REVIEW_REQUIRED",
    "invoiceNumber": "INV-001",
    "vendorName": "ABC Supplies",
    "amount": 15000,
    "confidenceScore": 0.62,
    "extractedAt": "2025-01-01T10:00:00Z"
  }
]
Auth: Required (Accountant / Admin)
```

### POST /review/vendor/:id/approve
```
Status: 200 OK | 404 Not Found
Auth: Required (Accountant / Admin)
```

### POST /review/vendor/:id/reject
```json
Request: { "reason": "Wrong vendor extracted" }
Status: 200 OK | 404 Not Found
Auth: Required (Accountant / Admin)
```

---

## Student APIs

### GET /review/student
```json
Response: [
  {
    "documentId": "uuid",
    "studentName": "Rahul Sharma",
    "enrollmentNo": "2024001",
    "amount": 25000,
    "confidence": 0.91,
    "manualReviewRequired": false
  }
]
Auth: Required (Accountant / Admin)
```

### POST /review/student/:id/approve
```
Status: 200 OK
Auth: Required (Accountant / Admin)
```

---

## ERP APIs

### GET /erp/status
```json
Response: {
  "tallyConnected": false,
  "pendingJobs": 3,
  "failedJobs": 1,
  "syncedJobs": 209
}
Status: 200 OK
Auth: Required (any role)
```

### GET /erp/history
```json
Response: [
  {
    "jobId": "uuid",
    "voucherNumber": "VCH-001",
    "status": "SYNCED",
    "attempts": 1,
    "syncedAt": "2025-01-01T10:05:00Z"
  }
]
Auth: Required (any role)
```

---

## Audit APIs

### GET /audit/events
```json
Response: [
  {
    "id": "uuid",
    "module": "VENDOR",
    "action": "APPROVED",
    "documentId": "uuid",
    "metadata": {},
    "createdAt": "2025-01-01T10:00:00Z"
  }
]
Auth: Required (any role)
```

---

## Configuration APIs

### GET /admin/config
```json
Response: {
  "ocrConfidenceThreshold": 0.7,
  "studentMatchThreshold": 0.8,
  "erpMaxRetries": 5
}
Auth: Required (Admin only)
```

### PUT /admin/config
```json
Request: { "ocrConfidenceThreshold": 0.75 }
Status: 200 OK | 400 Bad Request | 403 Forbidden
Auth: Required (Admin only)
```

---

## Health APIs

### GET /system/health
```json
Response: {
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  }
}
Status: 200 OK | 503 Service Unavailable
Auth: Public
```

### GET /system/capabilities
```json
Response: [
  { "name": "PostgreSQL", "status": "VERIFIED" },
  { "name": "Redis", "status": "VERIFIED" },
  { "name": "Tally Prime", "status": "UNVERIFIED" },
  { "name": "Azure OCR", "status": "UNVERIFIED" },
  { "name": "Gemini AI", "status": "UNVERIFIED" },
  { "name": "Gmail", "status": "UNVERIFIED" }
]
Auth: Required (any role)
```

---

## Migration APIs

### GET /tally/migrations
```json
Response: [
  {
    "id": "uuid",
    "operation": "CREATE_LEDGER",
    "objectName": "ABC Supplies",
    "status": "COMPLETED",
    "createdAt": "2025-01-01T09:00:00Z"
  }
]
Auth: Required (Accountant / Admin)
```

### GET /tally/migrations/:id
Returns full migration detail including XML request/response.
```
Auth: Required (Accountant / Admin)
```
