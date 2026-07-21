/**
 * File: apps/web/config/constants.ts
 * Purpose: Global application configuration constants.
 * Dependencies: None
 */

export const APP_CONSTANTS = {
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 25,
    MAX_PAGE_SIZE: 100,
  },
  UPLOADS: {
    MAX_FILE_SIZE_MB: 5,
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png'],
  },
  SYNC: {
    MAX_RETRIES: 3,
    POLLING_INTERVAL_MS: 30000, // 30 seconds
  },
} as const;
