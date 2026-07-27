import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async enforceUsageQuota(organizationId: string, featureFlag: string, metricType: string) {
    this.logger.log(`Enforcing usage quota for org ${organizationId} on ${featureFlag}`);

    // 1. Check Feature Flag
    const flag = await this.prisma.featureFlag.findFirst({
      where: { featureName: featureFlag, organizationId }
    });
    if (flag && !flag.isEnabled) {
      throw new ForbiddenException(`Feature ${featureFlag} is disabled for your organization.`);
    }

    // 2. Check Subscription
    const subscription = await this.prisma.organizationSubscription.findUnique({
      where: { organizationId }
    });
    if (!subscription || subscription.status !== 'ACTIVE') {
      throw new ForbiddenException('Active subscription required.');
    }

    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: subscription.planId }});
    const limits: any = plan?.limits || {};

    // 3. Check Usage (simplified for Phase 36 prototype)
    const usage = await this.prisma.usageMetric.findFirst({
      where: { organizationId, metricName: metricType, period: new Date().toISOString().substring(0, 7) }
    });

    const currentUsage = usage?.value || 0;
    const maxLimit = limits[metricType.toLowerCase()] || 0;

    if (maxLimit > 0 && currentUsage >= maxLimit) {
      throw new ForbiddenException(`Usage limit reached for ${metricType}. Please upgrade your plan.`);
    }

    // Increment Usage
    if (usage) {
      await this.prisma.usageMetric.update({ where: { id: usage.id }, data: { value: currentUsage + 1 }});
    } else {
      await this.prisma.usageMetric.create({
        data: { organizationId, metricName: metricType, value: 1, period: new Date().toISOString().substring(0, 7) }
      });
    }

    return true;
  }
}
