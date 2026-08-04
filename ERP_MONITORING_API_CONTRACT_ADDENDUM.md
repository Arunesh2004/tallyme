# ERP Monitoring API Contract Addendum

## 1. Executive Summary
This document serves as an addendum to the `PHASE_D_API_CONTRACT.md`. A comprehensive code inspection revealed that the ERP Monitoring endpoints (`GET /erp/status` and `GET /erp/history`) are fully implemented and functioning in the backend but were omitted from the official documentation. This addendum formalizes their exact data contracts derived directly from the backend source code (`MonitoringController`), paving the way for Frontend Commit 6 to proceed without violating architectural constraints.

## 2. Why the previous Phase D API Contract was incomplete
The `PHASE_D_API_CONTRACT.md` strictly documented the manual review mutations (`POST /vmms/review/approve`) but failed to capture the read-only operational telemetry routes implemented within `MonitoringController`. The backend developers shipped the endpoints using anonymous return objects and direct Prisma model serialization rather than formal DTO classes, bypassing standard OpenAPI/Swagger generation and causing the routes to slip past documentation audits.

---

## 3. GET /erp/status
### Complete endpoint specification
- **Route**: `/api/v1/erp/status` (Assuming global prefix `/api/v1`)
- **Controller**: `MonitoringController`
- **HTTP Method**: `GET`
- **Authentication**: Undocumented/Absent in controller (no `@UseGuards` present).
- **Authorization**: Undocumented/Absent in controller.
- **Request Parameters**: None.
- **Query Parameters**: None.

### Exact response JSON schema
```json
{
  "queueSize": "number",
  "workers": "string",
  "activeJobs": "number",
  "waitingJobs": "number",
  "failedJobs": "number",
  "retryCount": "number",
  "lastSync": "string (ISO 8601) | null",
  "lastFailure": "string (ISO 8601) | null",
  "averageSyncTime": "number"
}
```

### Field descriptions
- `queueSize` (Number): Sum of waiting and active jobs in `erp-sync-queue`.
- `workers` (String): Hardcoded to `"ONLINE"`.
- `activeJobs` (Number): Active jobs in `erp-sync-queue`.
- `waitingJobs` (Number): Waiting jobs in `erp-sync-queue`.
- `failedJobs` (Number): Failed jobs in `erp-sync-queue`.
- `retryCount` (Number): Delayed jobs in `erp-sync-queue`.
- `lastSync` (String | Null): The `updatedAt` timestamp of the most recent `ERPSyncJob` with `status = 'SYNCED'`. Null if none exist.
- `lastFailure` (String | Null): The `updatedAt` timestamp of the most recent `ERPSyncJob` with `status = 'FAILED_PERMANENT'`. Null if none exist.
- `averageSyncTime` (Number): Hardcoded to `0`.

---

## 4. GET /erp/history
### Complete endpoint specification
- **Route**: `/api/v1/erp/history`
- **Controller**: `MonitoringController`
- **HTTP Method**: `GET`
- **Authentication**: Undocumented/Absent in controller (no `@UseGuards` present).
- **Authorization**: Undocumented/Absent in controller.
- **Pagination**: Hardcoded to `take: 20` (No dynamic pagination supported).
- **Sorting**: Hardcoded to `orderBy: { createdAt: 'desc' }`.
- **Filtering**: None.

### Exact response JSON schema
Returns a JSON Array of `ERPSyncHistory` objects:
```json
[
  {
    "id": "string (uuid)",
    "jobId": "string (uuid)",
    "statusFrom": "string | null",
    "statusTo": "string",
    "reason": "string | null",
    "createdAt": "string (ISO 8601)"
  }
]
```

### Field descriptions (ERPSyncHistory object)
- `id` (String): UUID primary key.
- `jobId` (String): UUID foreign key to `ERPSyncJob`.
- `statusFrom` (String | Null): Previous status of the sync job (Enum serialized to string, e.g., "SYNCING").
- `statusTo` (String): New status of the sync job (Enum serialized to string, e.g., "SYNCED").
- `reason` (String | Null): Optional reason for the state transition.
- `createdAt` (String): Timestamp of the history log.

---

## 5. Status Codes (Both Endpoints)
- **200 OK**: Returned successfully upon resolving backend database and queue queries.
- *(Note: standard NestJS 500 Internal Server Error would apply for unhandled database/queue connection faults)*

## 6. Error Conditions
- No explicit error conditions or `HttpExceptions` are coded into these endpoints.

## 7. Existing implementation notes
- The endpoints aggregate live metrics across both Prisma (PostgreSQL) and the `IQueueService` (Redis).
- Data types leak database abstractions straight to the presentation layer without an intermediate normalization boundary.
- The `averageSyncTime` property on `/erp/status` is currently a non-functional hardcoded stub (`0`).

## 8. Missing DTO classes
There are absolutely no strongly-typed DTO classes (e.g., `class-validator`) defining the Requests or Responses for these endpoints.

## 9. Missing Swagger decorators
There are zero Swagger/OpenAPI decorators present. Specifically missing:
- `@ApiTags`
- `@ApiOperation`
- `@ApiOkResponse`
- `@ApiProperty`

## 10. Architectural observations
The implementation of these monitoring endpoints bypasses traditional NestJS strict typing and security guards. They return raw database objects and anonymous payloads. 

## 11. Recommendation
**GO.**
Frontend Commit 6 (ERP Monitoring UI) can now proceed safely. The backend endpoints do physically exist and their exact response schemas have been formally verified through this addendum. The frontend can consume these endpoints knowing precisely what fields (e.g., `statusFrom`, `statusTo`, `queueSize`) will be returned, without resorting to fabricating missing APIs.
