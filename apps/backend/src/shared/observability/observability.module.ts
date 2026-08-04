import { Module } from '@nestjs/common';
import { MetricsModule } from './metrics/metrics.module';
import { Tracer } from './tracing';
import { OpenTelemetryTracer } from './tracing/opentelemetry.tracer';

@Module({
  imports: [MetricsModule],
  providers: [
    {
      provide: Tracer,
      useClass: OpenTelemetryTracer,
    },
    OpenTelemetryTracer,
  ],
  exports: [MetricsModule, Tracer, OpenTelemetryTracer],
})
export class ObservabilityModule {}
