import { Module } from '@nestjs/common';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [MetricsModule],
  exports: [MetricsModule],
})
export class ObservabilityModule {}
