export interface Counter {
  inc(value?: number, labels?: Record<string, string>): void;
}

export interface Histogram {
  observe(value: number, labels?: Record<string, string>): void;
}

export interface Gauge {
  set(value: number, labels?: Record<string, string>): void;
  inc(value?: number, labels?: Record<string, string>): void;
  dec(value?: number, labels?: Record<string, string>): void;
}

export abstract class MetricsCollector {
  abstract createCounter(
    name: string,
    help: string,
    labelNames?: string[],
  ): Counter;
  abstract createHistogram(
    name: string,
    help: string,
    labelNames?: string[],
    buckets?: number[],
  ): Histogram;
  abstract createGauge(
    name: string,
    help: string,
    labelNames?: string[],
  ): Gauge;
}
