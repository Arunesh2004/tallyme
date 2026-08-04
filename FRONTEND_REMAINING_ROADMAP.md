# Frontend Remaining Roadmap

## 1. Executive Summary
This document outlines the remaining frontend implementation roadmap strictly based on the frozen `FRONTEND_IMPLEMENTATION_PLAN.md`, following the certification of Frontend Commit 5 (Student Review Queue). The remaining roadmap consists of exactly four logical commits to complete the remaining defined pages: ERP Monitoring, Tally Migration Center, Audit Center, and Configuration. 

## 2. Recommended Next Commit (Frontend Commit 6)
**Commit 6: ERP Monitoring UI**
It is recommended to proceed sequentially through the `FRONTEND_IMPLEMENTATION_PLAN.md`. The next defined feature is the ERP Monitoring interface.

---

## 3. Remaining Commits

### Commit 6: ERP Monitoring UI
- **Purpose**: Provide visibility into ERP synchronization statuses and XML payload histories.
- **Routes/Pages**: `/erp/status` and `/erp/history`
- **Components**: Queue visualizer, historical table of XML payloads (read-only).
- **Backend APIs Required**: `GET /erp/status` & `GET /erp/history`
- **API Status**: Unknown (Must be verified against Phase D backend implementation prior to start).
- **Blockers/Dependencies**: Relies on backend endpoints actually existing. If missing, UI must degrade gracefully without fabricating endpoints.

### Commit 7: Tally Migration Center
- **Purpose**: Manage and review exact data mappings and differences before finalizing sync to Tally Prime.
- **Routes/Pages**: `/tally/migrations`
- **Components**: Interactive Diff viewer. Approve / Rollback actionable buttons.
- **Backend APIs Required**: `GET /tally/migrations`, plus potential approval/rollback mutations (e.g., `POST /tally/migrations/approve`).
- **API Status**: Unknown. The frontend plan lists the GET endpoint, but the actionable buttons imply mutation endpoints. If mutation endpoints are missing from `PHASE_D_API_CONTRACT.md`, the actionable buttons must be visually disabled.
- **Blockers/Dependencies**: Heavily dependent on backend support for migration diffs and state management.

### Commit 8: Audit Center
- **Purpose**: Provide a universal chronological timeline of system events, operator actions, and automated matching logs.
- **Routes/Pages**: `/audit/events`
- **Components**: Universal Timeline Component with filtering by Actor/Module.
- **Backend APIs Required**: `GET /audit/events`
- **API Status**: Unknown.
- **Blockers/Dependencies**: Requires the backend audit logger to expose a queryable API endpoint.

### Commit 9: Configuration Management
- **Purpose**: Allow administrative control over core VMMS matching parameters and retry thresholds.
- **Routes/Pages**: `/admin/config`
- **Components**: Sliders for `matchingThresholds`, Number inputs for `retryLimits`. (Secrets hidden).
- **Backend APIs Required**: `GET /admin/config` and an implied mutation endpoint (e.g., `PUT /admin/config`) to save changes.
- **API Status**: Unknown. If the mutation endpoint does not exist, the sliders and inputs must be read-only.
- **Blockers/Dependencies**: Requires strict validation that configuration updates do not violate the core `PRODUCT_CONSTITUTION.md` rules regarding the Shared Accounting Engine.

---

## 4. Architectural Notes
* **System Health** was defined in the implementation plan under item 6 but was already bundled and certified during Frontend Commit 3 (Dashboard & System Health). It is not listed as a remaining standalone commit.
* **No Analytics Commit**: The frozen plan does NOT contain an Operations Analytics Dashboard.
* **Strict Rule Enforcement**: Any mutation required by these upcoming pages (e.g., Tally Migration Approval, Configuration Saves) that is NOT explicitly supported by the backend contract MUST NOT be invented by the frontend. Instead, the UI must render in a read-only or gracefully degraded state.
