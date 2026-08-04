import { OpenTelemetryTracer } from './opentelemetry.tracer';
import * as opentelemetry from '@opentelemetry/api';

jest.mock('@opentelemetry/api', () => {
  const mockSpan = {
    setAttribute: jest.fn(),
    setStatus: jest.fn(),
    end: jest.fn(),
    spanContext: jest.fn().mockReturnValue({ traceId: 'trace-1', spanId: 'span-1' }),
  };
  return {
    trace: {
      getTracer: jest.fn().mockReturnValue({
        startSpan: jest.fn().mockReturnValue(mockSpan),
        startActiveSpan: jest.fn().mockImplementation((name, fn) => {
          return fn(mockSpan);
        }),
      }),
    },
    context: {},
  };
});

describe('OpenTelemetryTracer', () => {
  let tracer: OpenTelemetryTracer;
  let mockOtelSpan: any;

  beforeEach(() => {
    tracer = new OpenTelemetryTracer();
    mockOtelSpan = opentelemetry.trace.getTracer('test').startSpan('test');
    jest.clearAllMocks();
  });

  describe('startSpan', () => {
    it('should create and wrap a span', () => {
      const span = tracer.startSpan('test-span');
      expect(span).toBeDefined();

      span.setAttribute('key', 'value');
      expect(mockOtelSpan.setAttribute).toHaveBeenCalledWith('key', 'value');

      span.setStatus('OK');
      expect(mockOtelSpan.setStatus).toHaveBeenCalledWith({ code: 1, message: undefined });

      span.setStatus('ERROR', 'failed');
      expect(mockOtelSpan.setStatus).toHaveBeenCalledWith({ code: 2, message: 'failed' });

      const ctx = span.getContext();
      expect(ctx).toEqual({ traceId: 'trace-1', spanId: 'span-1' });

      span.end();
      expect(mockOtelSpan.end).toHaveBeenCalled();
    });
  });

  describe('startActiveSpan', () => {
    it('should handle synchronous success', () => {
      const result = tracer.startActiveSpan('sync-test', (span) => {
        return 'success';
      });
      expect(result).toBe('success');
      expect(mockOtelSpan.end).toHaveBeenCalled();
    });

    it('should handle synchronous error', () => {
      expect(() => {
        tracer.startActiveSpan('sync-error', (span) => {
          throw new Error('sync failed');
        });
      }).toThrow('sync failed');
      expect(mockOtelSpan.setStatus).toHaveBeenCalledWith({ code: 2, message: 'sync failed' });
      expect(mockOtelSpan.end).toHaveBeenCalled();
    });

    it('should handle asynchronous success', async () => {
      const result = await tracer.startActiveSpan('async-test', async (span) => {
        return 'async-success';
      });
      expect(result).toBe('async-success');
      expect(mockOtelSpan.end).toHaveBeenCalled();
    });

    it('should handle asynchronous error', async () => {
      await expect(tracer.startActiveSpan('async-error', async (span) => {
        throw new Error('async failed');
      })).rejects.toThrow('async failed');
      expect(mockOtelSpan.setStatus).toHaveBeenCalledWith({ code: 2, message: 'async failed' });
      expect(mockOtelSpan.end).toHaveBeenCalled();
    });
  });
});
