import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../../core/logger/logger.service';
import { ERPTransportException } from '../exceptions/erp-transport.exception';
import { ERPRequestContext, TransportResult } from '../dto/transport.dto';

@Injectable()
export class TallyTransportService {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  private getConfig(): { url: string; timeoutMs: number } {
    const host = this.configService.get<string>('TALLY_HOST') || 'localhost';
    const port = this.configService.get<string>('TALLY_PORT') || '9000';
    const timeoutMsRaw = this.configService.get<string>(
      'TALLY_HTTP_TIMEOUT_MS',
    );

    const url = `http://${host}:${port}`;
    let timeoutMs = 120000; // Default to 120 seconds
    if (timeoutMsRaw) {
      timeoutMs = parseInt(timeoutMsRaw, 10);
      if (isNaN(timeoutMs) || timeoutMs <= 0) {
        throw new ERPTransportException(
          'Configuration error: TALLY_HTTP_TIMEOUT_MS must be a positive integer',
          'CONFIG_ERROR',
        );
      }
    }

    return { url, timeoutMs };
  }

  /**
   * Sends the generic payload to Tally.
   * Exclusively handles transport layer concerns: HTTP POST, timeouts, and network errors.
   */
  async send(
    payload: string,
    context: ERPRequestContext,
  ): Promise<TransportResult> {
    const { url, timeoutMs } = this.getConfig();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const startTime = Date.now();
    let httpStatus = 0;
    let transportResultLabel = 'SUCCESS';

    try {
      // DEBUG-ONLY: Payload capture — gated behind TALLY_DEBUG_PAYLOAD flag.
      // NEVER runs in production (NODE_ENV=production).
      const debugEnabled =
        process.env.NODE_ENV !== 'production' &&
        this.configService.get<string>('TALLY_DEBUG_PAYLOAD') === 'true';
      if (debugEnabled) {
        require('fs').writeFileSync(
          'forensic-payload-raw.xml',
          payload,
          'utf8',
        );
        this.logger.debug(
          'Debug payload captured to forensic-payload-raw.xml',
          'TallyTransportService',
        );
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml',
          Accept: 'text/xml',
        },
        body: payload,
        signal: controller.signal as any,
      });

      httpStatus = response.status;
      const responseText = await response.text();

      const isSuccess = response.ok;
      if (!isSuccess) {
        transportResultLabel = 'HTTP_ERROR';
        // Note: We don't throw for 400/500 responses here anymore since it's a valid transport result,
        // the response is successfully transported back. Phase 3 interprets HTTP errors if needed.
        // Wait, Tally typically uses 200 OK for everything, but if it returns 500 we still got a response.
      }

      const durationMs = Date.now() - startTime;
      // FIX 2: Compute actual payload hash and byte size for audit trail
      const xmlHash = crypto
        .createHash('sha256')
        .update(payload, 'utf8')
        .digest('hex');
      const payloadSizeBytes = Buffer.byteLength(payload, 'utf8');
      this.logTransport(
        context,
        url,
        payloadSizeBytes,
        durationMs,
        httpStatus,
        transportResultLabel,
        xmlHash,
      );

      clearTimeout(timeoutId);

      return {
        rawResponse: responseText,
        httpStatus,
        durationMs,
        success: isSuccess,
        xmlHash,
        payloadSizeBytes,
      };
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        transportResultLabel = 'TIMEOUT';
        const durationMs = Date.now() - startTime;
        const payloadSizeBytes = Buffer.byteLength(payload, 'utf8');
        this.logTransport(
          context,
          url,
          payloadSizeBytes,
          durationMs,
          httpStatus,
          transportResultLabel,
        );
        throw new ERPTransportException(
          `Request to Tally timed out after ${timeoutMs}ms`,
          'TIMEOUT',
        );
      }

      transportResultLabel = 'NETWORK_ERROR';
      const code = error.cause?.code || 'CONNECTION_FAILED';
      const durationMs = Date.now() - startTime;
      const payloadSizeBytes = Buffer.byteLength(payload, 'utf8');
      this.logTransport(
        context,
        url,
        payloadSizeBytes,
        durationMs,
        httpStatus,
        transportResultLabel,
      );
      throw new ERPTransportException(
        `Failed to connect to Tally: ${(error as any).message}`,
        code,
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Performs a lightweight connection test to the configurable Tally health endpoint.
   */
  async checkHealth(): Promise<boolean> {
    const host = this.configService.get<string>('TALLY_HOST') || 'localhost';
    const port = this.configService.get<string>('TALLY_PORT') || '9000';
    const url = `http://${host}:${port}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal as any,
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Emits structured logs specifically for diagnostics, using request context.
   */
  private logTransport(
    context: ERPRequestContext,
    endpoint: string,
    payloadSizeBytes: number,
    durationMs: number,
    httpStatus: number,
    transportStatus: string,
    xmlHash?: string,
  ) {
    this.logger.log(
      {
        message: 'ERP Transport Execution',
        ...context,
        endpoint,
        payloadSizeBytes,
        durationMs,
        httpStatus,
        transportStatus,
        ...(xmlHash ? { xmlHash: xmlHash.substring(0, 16) + '...' } : {}),
      },
      'TallyTransportService',
    );
  }
}
