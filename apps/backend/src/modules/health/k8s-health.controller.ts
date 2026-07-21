// src/modules/health/k8s-health.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrometheusService } from '../../shared/observability/metrics/prometheus.service';

@Controller()
export class KubernetesHealthController {
  constructor(private readonly prometheus: PrometheusService) {}

  @Get('liveness')
  liveness() {
    return { status: 'OK' };
  }

  @Get('readiness')
  readiness() {
    // Real implementation would ping DB/Redis
    return { status: 'READY' };
  }

  @Get('metrics')
  async metrics() {
    return this.prometheus.getMetrics();
  }
}

// src/modules/admin/admin.controller.ts
import {
  PermissionsGuard,
  RequirePermissions,
} from '../auth/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminController {
  @Get('system')
  @RequirePermissions('Admin.Read')
  getSystemStatus() {
    return { version: '1.0.0', status: 'HEALTHY' };
  }

  @Get('queues')
  @RequirePermissions('Admin.Read')
  getQueues() {
    return { data: [] };
  }
}
