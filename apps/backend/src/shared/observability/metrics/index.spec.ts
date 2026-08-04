import { MetricsCollector } from './index';

describe('MetricsCollector', () => {
  it('should be defined', () => {
    class DummyCollector extends MetricsCollector {
      createCounter(name: string, help: string, labelNames?: string[]) {
        return { inc: jest.fn() };
      }
      createHistogram(name: string, help: string, labelNames?: string[], buckets?: number[]) {
        return { observe: jest.fn() };
      }
      createGauge(name: string, help: string, labelNames?: string[]) {
        return { set: jest.fn(), inc: jest.fn(), dec: jest.fn() };
      }
    }
    const instance = new DummyCollector();
    expect(instance).toBeDefined();
    expect(instance.createCounter('c', 'h')).toBeDefined();
  });
});
