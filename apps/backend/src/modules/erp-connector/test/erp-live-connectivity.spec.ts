import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../../../src/core/logger/logger.service';
import { TallyTransportService } from '../services/transport.service';
import { ERPRequestContext } from '../dto/transport.dto';

describe('Live Tally Connectivity Validation', () => {
  let transportService: TallyTransportService;

  beforeAll(() => {
    const configService = new ConfigService({
      TALLY_HOST: 'localhost',
      TALLY_PORT: '9000',
      TALLY_TIMEOUT_MS: '10000',
    });

    // Mock logger to avoid cluttering console
    const mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    } as unknown as LoggerService;

    transportService = new TallyTransportService(configService, mockLogger);
  });

  it('should verify Tally is reachable and responding to health check', async () => {
    const isHealthy = await transportService.checkHealth();
    expect(isHealthy).toBe(true);
  });

  it('should accept a basic XML request and return XML response', async () => {
    const payload = `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>List of Accounts</REPORTNAME>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;

    const context: ERPRequestContext = {
      voucherId: 'health',
      jobId: 'test-job',
      attemptNumber: 1,
    };

    const result = await transportService.send(payload, context);

    expect(result.success).toBe(true);
    expect(result.httpStatus).toBe(200);
    expect(result.rawResponse).toContain('<ENVELOPE>'); // Tally responds with ENVELOPE
    expect(result.durationMs).toBeGreaterThan(0);
  });
});
