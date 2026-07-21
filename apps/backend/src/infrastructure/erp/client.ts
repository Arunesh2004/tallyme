// client/index.ts
import { Injectable } from '@nestjs/common';
import { ILogger } from '../../../shared/observability';
import { ERPConfiguration } from '../contracts/index';

@Injectable()
export class ERPHttpClient {
  constructor(private readonly config: ERPConfiguration, private readonly logger: ILogger) {}

  async post(xmlPayload: string, correlationId: string): Promise<string> {
    this.logger.info(`Sending request to ERP`, { correlationId });
    // Real impl uses undici or axios
    return '<ENVELOPE><BODY><DATA><LINEERROR>None</LINEERROR></DATA></BODY></ENVELOPE>';
  }
}

// retry/index.ts
@Injectable()
export class ERPFailureClassifier {
  isRetryable(error: any, rawResponse?: string): boolean {
    if (error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT') return true;
    if (rawResponse && rawResponse.includes('Server Busy')) return true;
    
    // TDL / Validation errors are fatal
    if (rawResponse && rawResponse.includes('Line Error')) return false;
    return false;
  }
}
