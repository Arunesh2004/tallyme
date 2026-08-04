import { Injectable } from '@nestjs/common';
import { Span as OtelSpan, trace, Tracer as OtelTracer, context } from '@opentelemetry/api';
import { Tracer, Span, TraceContext } from './index';

class OpenTelemetrySpan implements Span {
  constructor(private readonly span: OtelSpan) {}

  setAttribute(key: string, value: string | number | boolean): this {
    this.span.setAttribute(key, value);
    return this;
  }

  setStatus(status: 'OK' | 'ERROR', message?: string): this {
    this.span.setStatus({
      code: status === 'OK' ? 1 : 2,
      message,
    });
    return this;
  }

  end(): void {
    this.span.end();
  }

  getContext(): TraceContext {
    const ctx = this.span.spanContext();
    return {
      traceId: ctx.traceId,
      spanId: ctx.spanId,
    };
  }
}

@Injectable()
export class OpenTelemetryTracer extends Tracer {
  private tracer: OtelTracer;

  constructor() {
    super();
    this.tracer = trace.getTracer('tallyme-backend');
  }

  startSpan(name: string): Span {
    const span = this.tracer.startSpan(name);
    return new OpenTelemetrySpan(span);
  }

  startActiveSpan<F extends (span: Span) => unknown>(
    name: string,
    fn: F,
  ): ReturnType<F> {
    return this.tracer.startActiveSpan(name, (span: OtelSpan) => {
      const wrappedSpan = new OpenTelemetrySpan(span);
      try {
        const result = fn(wrappedSpan);
        if (result instanceof Promise) {
          return result
            .then((res) => {
              wrappedSpan.end();
              return res;
            })
            .catch((err) => {
              wrappedSpan.setStatus('ERROR', err.message);
              wrappedSpan.end();
              throw err;
            }) as ReturnType<F>;
        }
        wrappedSpan.end();
        return result as ReturnType<F>;
      } catch (err: any) {
        wrappedSpan.setStatus('ERROR', err.message);
        wrappedSpan.end();
        throw err;
      }
    });
  }
}
