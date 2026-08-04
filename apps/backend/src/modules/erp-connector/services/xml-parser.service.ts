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

    // ── Extract all Tally response fields ───────────────────────────────
    const statusMatch = xml.match(/<STATUS>(\d+)<\/STATUS>/i);
    const createdMatch = xml.match(/<CREATED>(\d+)<\/CREATED>/i);
    const alteredMatch = xml.match(/<ALTERED>(\d+)<\/ALTERED>/i);
    const errorsMatch = xml.match(/<ERRORS>(\d+)<\/ERRORS>/i);
    const lineErrorMatch = xml.match(/<LINEERROR>([\s\S]*?)<\/LINEERROR>/i);
    const lastVchIdMatch = xml.match(/<LASTVCHID>([^<]+)<\/LASTVCHID>/i);
    // Phase I.1 additions
    const vchNameMatch = xml.match(/<VCHNAME>([^<]+)<\/VCHNAME>/i);
    const warnMsgMatch = xml.match(/<WARNMSG>([\s\S]*?)<\/WARNMSG>/i);

    const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : null;
    const created = createdMatch ? parseInt(createdMatch[1], 10) : 0;
    const altered = alteredMatch ? parseInt(alteredMatch[1], 10) : 0;
    const errors = errorsMatch ? parseInt(errorsMatch[1], 10) : 0;

    const lineError = lineErrorMatch ? lineErrorMatch[1].trim() : null;
    const vchName = vchNameMatch ? vchNameMatch[1].trim() : undefined;
    const warnMsg = warnMsgMatch ? warnMsgMatch[1].trim() : undefined;

    result.referenceId = lastVchIdMatch ? lastVchIdMatch[1].trim() : undefined;
    if (vchName) result.voucherNumber = vchName;

    result.metadata = {
      status: statusCode,
      createdCount: created,
      alteredCount: altered,
      errorCount: errors,
      vchName,
      warnMsg,
    };

    // ── Success determination (priority order) ───────────────────────────
    // 1. STATUS field (primary — most reliable across Tally versions)
    // 2. CREATED / ERRORS (fallback for older installs without STATUS)
    let isSuccess: boolean;

    if (statusCode !== null) {
      // STATUS=1 → success, STATUS=0 → failure
      isSuccess = statusCode === 1;
    } else {
      // Fallback: classic CREATED > 0 && ERRORS == 0
      isSuccess = (created > 0 || altered > 0) && errors === 0;
    }

    if (isSuccess) {
      result.success = true;
      result.responseCode = 'SUCCESS';
      result.message = 'Voucher synchronized successfully';
    } else {
      result.success = false;
      result.responseCode = 'BUSINESS_ERROR';
      result.message = lineError || 'Unknown Tally validation error';
    }

    // ── Warnings ─────────────────────────────────────────────────────────
    if (!result.referenceId && result.success) {
      warnings.push('Missing LASTVCHID in successful response');
    }
    if (warnMsg) {
      warnings.push(`Tally warning: ${warnMsg}`);
    }

    this.logger.debug(
      {
        message: 'Tally XML Parsed',
        success: result.success,
        responseCode: result.responseCode,
        statusField: statusCode,
        warningsCount: warnings.length,
      },
      'TallyXmlParserService',
    );

    return result;
  }
}
