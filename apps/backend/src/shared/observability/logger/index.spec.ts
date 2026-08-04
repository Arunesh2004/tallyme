import { Test, TestingModule } from '@nestjs/testing';
import { Logger, LoggerFactory, LoggerModule } from './index';
import { CorrelationContext } from '../context';

describe('Logger', () => {
  let originalStdoutWrite: any;
  let originalStderrWrite: any;
  
  beforeEach(() => {
    originalStdoutWrite = process.stdout.write;
    originalStderrWrite = process.stderr.write;
    
    process.stdout.write = jest.fn();
    process.stderr.write = jest.fn();
  });

  afterEach(() => {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  });

  it('should log info with mask', () => {
    const logger = new Logger('TestModule');
    logger.info('Test info', { password: 'secretpassword', normal: 'value' });
    
    expect(process.stdout.write).toHaveBeenCalled();
    const callArgs = (process.stdout.write as jest.Mock).mock.calls[0][0];
    const parsed = JSON.parse(callArgs);
    
    expect(parsed.level).toBe('INFO');
    expect(parsed.module).toBe('TestModule');
    expect(parsed.meta.password).toBe('***MASKED***');
    expect(parsed.meta.normal).toBe('value');
  });

  it('should format all log levels correctly', () => {
    const logger = new Logger('TestModule');
    
    logger.trace('msg');
    logger.debug('msg');
    logger.warn('msg');
    logger.error('msg', 'trace-data');
    logger.fatal('msg', 'fatal-trace');

    expect(process.stdout.write).toHaveBeenCalledTimes(3); // trace, debug, warn
    expect(process.stderr.write).toHaveBeenCalledTimes(2); // error, fatal
  });
});

describe('LoggerFactory and LoggerModule', () => {
  it('should provide logger factory from module', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [LoggerModule],
    }).compile();

    const factory = module.get<LoggerFactory>(LoggerFactory);
    expect(factory).toBeDefined();

    const logger = factory.create('TestFactory');
    expect(logger).toBeInstanceOf(Logger);
  });
});
