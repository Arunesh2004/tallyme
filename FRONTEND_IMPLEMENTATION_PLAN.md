# Frontend Implementation Plan

## Architectural Decision
The TallyMe Enterprise Frontend will be built as a standalone SPA (React/Vite or Next.js) acting purely as an orchestration GUI over the existing NestJS Backend layer. It will not duplicate any logic.

## Defined Pages & Component Map

1. **Dashboard**
   - **Endpoint Used**: `GET /dashboard/overview`
   - **Components**: High-level KPI widgets, sparkline graphs for sync statuses.

2. **Vendor Review Queue**
   - **Endpoint Used**: `GET /review/vendor`
   - **Components**: Data Grid (Pagination, Filtering by Confidence), Invoice Details Modal.

3. **Student Review Queue**
   - **Endpoint Used**: `GET /review/student`
   - **Components**: Data Grid (Pagination, Sort by Match Status), Student Matching Modal.

4. **ERP Monitoring**
   - **Endpoint Used**: `GET /erp/status` & `GET /erp/history`
   - **Components**: Queue visualizer, historical table of XML payloads (read-only).

5. **Tally Migration Center**
   - **Endpoint Used**: `GET /tally/migrations`
   - **Components**: Interactive Diff viewer. Approve / Rollback actionable buttons.

6. **System Health**
   - **Endpoint Used**: `GET /system/health` & `GET /system/capabilities`
   - **Components**: Ping visualizer for PostgreSQL, Redis, Tally Prime, Azure.

7. **Audit Center**
   - **Endpoint Used**: `GET /audit/events`
   - **Components**: Universal Timeline Component with filtering by Actor/Module.

8. **Configuration**
   - **Endpoint Used**: `GET /admin/config`
   - **Components**: Sliders for `matchingThresholds`, Number inputs for `retryLimits`. (Secrets hidden).
