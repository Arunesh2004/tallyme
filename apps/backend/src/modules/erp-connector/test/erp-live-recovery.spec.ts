import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../../../../src/core/logger/logger.service';
import { TallyTransportService } from '../services/transport.service';
import { ERPTransportException } from '../exceptions/erp-transport.exception';

describe('Live Tally Failure Recovery Validation', () => {
  it('should detect network error when Tally is unavailable', async () => {
    // Point to a port where Tally is DEFINITELY not running
    const configService = new ConfigService({
      TALLY_HOST: 'localhost',
      TALLY_PORT: '9001',
      TALLY_TIMEOUT_MS: '1000',
    });
    const mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    } as unknown as LoggerService;
    const transport = new TallyTransportService(configService, mockLogger);

    await expect(
      transport.send('<XML/>', {
        voucherId: 'fail',
        jobId: 'fail',
        attemptNumber: 1,
      }),
    ).rejects.toThrow(ERPTransportException);
  });

  it('should handle timeout correctly', async () => {
    // Use an incredibly short timeout to force a timeout error even if Tally is fast
    const configService = new ConfigService({
      TALLY_HOST: 'localhost',
      TALLY_PORT: '9000',
      TALLY_TIMEOUT_MS: '1',
    });
    const mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    } as unknown as LoggerService;
    const transport = new TallyTransportService(configService, mockLogger);

    await expect(
      transport.send('<XML/>', {
        voucherId: 'timeout',
        jobId: 'timeout',
        attemptNumber: 1,
      }),
    ).rejects.toThrow(ERPTransportException);
  });
});
