import { Logger } from '@nestjs/common';

describe('worker.main', () => {
  let originalError: any;
  let mockLoggerLog: jest.SpyInstance;

  beforeAll(() => {
    mockLoggerLog = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    originalError = console.error;
    console.error = jest.fn();
  });

  afterAll(() => {
    mockLoggerLog.mockRestore();
    console.error = originalError;
  });

  it('should run bootstrap logic without crashing', async () => {
    // Require the module directly to execute the top level bootstrap call
    require('./worker.main');
    
    // Give promises a tick to resolve
    await new Promise(resolve => setTimeout(resolve, 50));
    
    expect(mockLoggerLog).toHaveBeenCalledWith('Starting BullMQ Background Workers (Standalone Process)...');
    expect(mockLoggerLog).toHaveBeenCalledWith('InvoiceExtractionWorker is listening on Redis.');
  });
});
