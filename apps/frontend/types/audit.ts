export interface AuditEventRecord {
  timestamp: string;
  module: string;
  event: string;
  result: string;
  user: string;
  correlationId: string;
}
