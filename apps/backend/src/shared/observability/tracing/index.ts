export interface TraceContext {
  traceId: string;
  spanId: string;
}

export interface Span {
  setAttribute(key: string, value: string | number | boolean): this;
  setStatus(status: 'OK' | 'ERROR', message?: string): this;
  end(): void;
  getContext(): TraceContext;
}

export abstract class Tracer {
  abstract startSpan(name: string): Span;
  abstract startActiveSpan<F extends (span: Span) => unknown>(name: string, fn: F): ReturnType<F>;
}
