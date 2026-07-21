export const ERP_REPOSITORY = 'ERP_REPOSITORY';
export const VOUCHER_REPOSITORY = 'VOUCHER_REPOSITORY';
export const ERP_SYNC_QUEUE = 'tally-sync'; // Tally sync was hardcoded previously, alias to erp-sync logic
export const ERP_RETRY_QUEUE = 'erp-retry';
export const ERP_DEAD_LETTER_QUEUE = 'erp-dead-letter';

export const ERP_SYNC_STATUS = {
  PENDING: 'PENDING',
  SYNCING: 'SYNCING',
  SYNCED: 'SYNCED',
  FAILED_TEMPORARY: 'FAILED_TEMPORARY',
  FAILED_PERMANENT: 'FAILED_PERMANENT',
  UNKNOWN: 'UNKNOWN',
  VERIFYING: 'VERIFYING',
  MANUAL_REVIEW: 'MANUAL_REVIEW',
  CANCELLED: 'CANCELLED',
  RETRY_PENDING: 'RETRY_PENDING',
};

export const ERP_ADAPTERS = {
  TALLY_PRIME_V1: 'TALLY_PRIME_V1',
};
