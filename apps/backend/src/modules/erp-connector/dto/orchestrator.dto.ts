export interface ERPSyncResult {
  success: boolean;
  referenceId?: string;
  responseType: string;
  message?: string;
  parserWarnings: string[];
  /** The raw XML payload sent to Tally — stored for audit trail. */
  requestXml?: string;
  /** The raw XML response received from Tally — stored for audit trail. */
  rawResponse?: string;
  transportMetadata?: {
    durationMs: number;
    httpStatus: number;
    /** SHA-256 hash of the XML payload sent (from TransportResult.xmlHash). */
    xmlHash?: string;
    /** UTF-8 byte size of the XML payload sent (from TransportResult.payloadSizeBytes). */
    payloadSizeBytes?: number;
  };
  durationMs: number;
}
