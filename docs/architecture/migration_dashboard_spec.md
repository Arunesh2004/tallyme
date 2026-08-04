# Migration Dashboard Specification

## Purpose
Provides a consolidated view of the Universal Document Intelligence Migration.

## Status Indicators
- **Migration Status:** READY / BLOCKED / IN_PROGRESS
- **Feature Flag Status:** ON / OFF
- **Legacy Pipeline Status:** HEALTHY / DEGRADED
- **Universal Pipeline Status:** HEALTHY / DEGRADED

## Document Processing Metrics
- **Total Documents Processed:** Integer
- **Purchase Documents:** Integer
- **Sales Documents:** Integer
- **Receipt Documents:** Integer
- **Journal Documents:** Integer

## Accuracy Metrics
- **Classification Accuracy:** Percentage (%)
- **Extraction Accuracy:** Percentage (%)
- **Voucher Accuracy:** Percentage (%)
- **Average Confidence:** Float (0.0 - 1.0)
- **Manual Review Rate:** Percentage (%)

## Migration specific metrics
- **Compatibility Adapter Usage:** Count of invocations
- **Dual Run Matches:** Count
- **Dual Run Mismatches:** Count
- **Migration Progress:** Percentage (Legacy consumers migrated vs. remaining)

## Rollback & Readiness
- **Remaining Legacy Dependencies:** List of components (e.g., `vendor-slip.worker.ts`)
- **Rollback Status:** READY / ENGAGED
- **Migration Readiness:** READY / BLOCKED (Evaluated via Readiness Gate)
