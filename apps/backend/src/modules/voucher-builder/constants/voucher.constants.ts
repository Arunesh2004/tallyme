export const VOUCHER_REPOSITORY = 'VOUCHER_REPOSITORY';
export const VOUCHER_BUILDER_QUEUE = 'voucher-generation';
export const TALLY_SYNC_QUEUE = 'tally-sync';

export const VOUCHER_STATUS = {
  DRAFT: 'DRAFT',
  VALIDATED: 'VALIDATED',
  INVALID: 'INVALID',
  MANUAL_REVIEW: 'MANUAL_REVIEW',
  READY_FOR_SYNC: 'READY_FOR_SYNC',
};

export const VOUCHER_TYPES = {
  RECEIPT: 'Receipt',
  JOURNAL: 'Journal',
  CONTRA: 'Contra',
  PAYMENT: 'Payment',
};
