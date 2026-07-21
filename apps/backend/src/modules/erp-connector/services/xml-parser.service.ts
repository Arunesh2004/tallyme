import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../../core/logger/logger.service';
import { TransportResult } from '../dto/transport.dto';
import { ERPResponse } from '../dto/response.dto';

@Injectable()
export class TallyXmlParserService {
  constructor(private readonly logger: LoggerService) {}

  /**
   * Parses the raw Tally XML response into a normalized ERPResponse.
   * This parser is purely functional and contains no business routing logic.
   */
  parse(transportResult: TransportResult): ERPResponse {
    const warnings: string[] = [];
    const xml = transportResult.rawResponse || '';

    // Default pessimistic
    const result: ERPResponse = {
      success: false,
      parserWarnings: warnings,
    };

    // If HTTP failed fundamentally, wrap it as a business failure
    // (though retry/dead-letter decisions are left to Orchestrator)
    if (!transportResult.success) {
      result.message = `HTTP Transport Failure: Status ${transportResult.httpStatus}`;
      result.responseCode = 'TRANSPORT_ERROR';
      return result;
    }

    if (!xml.trim()) {
      warnings.push('Empty XML response received from Tally');
      result.message = 'Empty response body';
      result.responseCode = 'EMPTY_RESPONSE';
      return result;
    }

    if (!xml.includes('<RESPONSE>') && !xml.includes('<ENVELOPE>')) {
      warnings.push('XML does not contain recognized Tally root tags');
      result.message = 'Malformed XML root';
      result.responseCode = 'MALFORMED_XML';
      return result;
    }

    // Extract common Tally nodes using regex (lightweight parser)
    const createdMatch = xml.match(/<CREATED>(\d+)<\/CREATED>/i);
    const alteredMatch = xml.match(/<ALTERED>(\d+)<\/ALTERED>/i);
    const errorsMatch = xml.match(/<ERRORS>(\d+)<\/ERRORS>/i);
    const lineErrorMatch = xml.match(/<LINEERROR>([\s\S]*?)<\/LINEERROR>/i);
    const lastVchIdMatch = xml.match(/<LASTVCHID>([^<]+)<\/LASTVCHID>/i);

    const created = createdMatch ? parseInt(createdMatch[1], 10) : 0;
    const altered = alteredMatch ? parseInt(alteredMatch[1], 10) : 0;
    const errors = errorsMatch ? parseInt(errorsMatch[1], 10) : 0;

    const lineError = lineErrorMatch ? lineErrorMatch[1].trim() : null;

    result.referenceId = lastVchIdMatch ? lastVchIdMatch[1].trim() : undefined;

    result.metadata = {
      createdCount: created,
      alteredCount: altered,
      errorCount: errors,
    };

    // Determine Success
    // Tally considers a voucher successful if CREATED > 0 or ALTERED > 0 and ERRORS == 0
    if ((created > 0 || altered > 0) && errors === 0) {
      result.success = true;
      result.responseCode = 'SUCCESS';
      result.message = 'Voucher synchronized successfully';
    } else {
      result.success = false;
      result.responseCode = 'BUSINESS_ERROR';
      result.message = lineError || 'Unknown Tally validation error';
    }

    if (!result.referenceId && result.success) {
      warnings.push('Missing LASTVCHID in successful response');
    }

    this.logger.debug(
      {
        message: 'Tally XML Parsed',
        success: result.success,
        responseCode: result.responseCode,
        warningsCount: warnings.length,
      },
      'TallyXmlParserService',
    );

    return result;
  }
}
