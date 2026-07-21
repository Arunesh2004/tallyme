// Registry of all allowed queue names in the system to prevent typos
export enum QueueRegistry {
  PAYMENT_PROCESSING = 'payment-processing-queue',
  VOUCHER_GENERATION = 'voucher-generation-queue',
  EMAIL_NOTIFICATION = 'email-notification-queue',
  REPORT_GENERATION = 'report-generation-queue',
  TALLY_SYNC = 'tally-sync-queue',
}
