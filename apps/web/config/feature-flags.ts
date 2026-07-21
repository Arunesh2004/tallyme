/**
 * File: apps/web/config/feature-flags.ts
 * Purpose: Centralized management of application feature flags.
 * Dependencies: None
 */

export const FEATURE_FLAGS = {
  ENABLE_AI_PREDICTIONS: false,
  ENABLE_VENDOR_SLIPS: false,
  ENABLE_ADVANCED_REPORTS: true,
} as const;
