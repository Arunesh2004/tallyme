export const ERP_REPOSITORY = 'ERP_REPOSITORY';
export const ERP_SYNC_QUEUE = 'tally-sync'; // Tally sync was hardcoded previously, alias to erp-sync logic
export const ERP_RETRY_QUEUE = 'erp-retry';
export const ERP_DEAD_LETTER_QUEUE = 'erp-dead-letter';

export const ERP_SYNC_STATUS = {
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  RETRYING: 'RETRYING',
  DUPLICATE: 'DUPLICATE',
  PARTIAL: 'PARTIAL',
  TIMEOUT: 'TIMEOUT',
  REJECTED: 'REJECTED',
  PENDING: 'PENDING',
};

export const ERP_ADAPTERS = {
  TALLY_PRIME_V1: 'TALLY_PRIME_V1',
};
