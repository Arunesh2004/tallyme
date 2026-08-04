# Phase C Dashboard UI Specification

## 1. Overview
The VMMS Operational Dashboard is a read-only administrative interface built for Principal Engineers, Accounting Admins, and Operations teams to evaluate the shadow matcher's performance in real-time.

## 2. Global Layout
- **Navigation Sidebar:**
  - Overview
  - Mismatch Explorer
  - Replay Simulator
  - Feature Flag Control
- **Global Header:**
  - Date Range Picker (Today, Last 7 Days, Last 30 Days)
  - Company Context Switcher

## 3. View: Overview (Summary)
**Purpose:** High-level system health and match rates.
- **Top Row (KPI Cards):**
  - **Total Invoices:** Large integer count.
  - **Agreement Rate:** Percentage (Green if > 95%, Yellow if > 80%, Red otherwise).
  - **VMMS Automated Rate:** Percentage (Total Stage 1 & 2 matches).
  - **Shadow Error Rate:** Percentage (Should be exactly 0.00%).
- **Middle Row (Charts):**
  - **Agreement Trend (Line Chart):** Legacy matches vs VMMS matches over the selected date range.
  - **Match Distribution (Donut Chart):** Breakdown of VMMS decisions (`STAGE_1`, `STAGE_2`, `ALIAS`, `MANUAL_REVIEW`).
- **Bottom Row (Health):**
  - **Current Flag Status:** Read-only badges indicating if `VMMS_ENABLED`, `VMMS_MATCHER_ENABLED`, and `VMMS_DUAL_WRITE_ENABLED` are active.

## 4. View: Mismatch Explorer
**Purpose:** Detailed triage of invoices where Legacy and VMMS diverged.
- **Data Table:**
  - Columns: Date, Invoice ID, Legacy Selection, VMMS Selection, Confidence Delta, Action.
  - Sorting: By Date, or by Confidence Delta (to find the most egregious errors).
  - Filtering: By Reason Code.
- **Detail Flyout (On Click):**
  - **Side-by-Side Comparison:**
    - *Left Column (Legacy):* Matched Vendor Name, Matched GSTIN, Rule Triggered.
    - *Right Column (VMMS):* Matched Ledger Name, Matched GSTIN, Stage Triggered.
  - **Raw Evidence:** Expandable JSON viewer for `MatchEvidence`.
  - **Resolution Actions:**
    - Button: `Mark Legacy Correct`
    - Button: `Mark VMMS Correct`
    - Button: `Create Routing Alias`

## 5. View: Replay Simulator
**Purpose:** Testing arbitrary invoices against the *current* master branch VMMS logic.
- **Input:** Search bar accepting an `InvoiceCandidate` UUID.
- **Execution:** Button `Simulate Match`.
- **Output:**
  - Visual trace of the matching pipeline (GSTIN Extraction -> Normalization -> Stage 1 -> Stage 2 -> Result).
  - Highlights whether the simulation resulted in a better or worse outcome than the historical production run.

## 6. Interaction Rules
- **No Mutability of Vouchers:** The UI strictly prevents any modification to an actual invoice, voucher, or allocation.
- **Audit Trails:** Every click of a "Mark Correct" or "Create Alias" button requires a mandatory text comment and is permanently logged via the `VendorAudit` table.
