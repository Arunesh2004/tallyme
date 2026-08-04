import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

describe('BillingService', () => {
  let service: BillingService;

  const mockPrisma = {
    featureFlag: { findFirst: jest.fn() },
    organizationSubscription: { findUnique: jest.fn() },
    subscriptionPlan: { findUnique: jest.fn() },
    usageMetric: { findFirst: jest.fn(), update: jest.fn(), create: jest.fn() },
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('enforceUsageQuota', () => {
    const orgId = 'org-123';
    const feature = 'AI_OCR';
    const metric = 'OCR_CALLS';

    beforeEach(() => {
      mockPrisma.featureFlag.findFirst.mockResolvedValue(null);
      mockPrisma.organizationSubscription.findUnique.mockResolvedValue({
        organizationId: orgId,
        planId: 'plan-pro',
        status: 'ACTIVE',
      });
      mockPrisma.subscriptionPlan.findUnique.mockResolvedValue({
        id: 'plan-pro',
        limits: { ocr_calls: 1000 },
      });
      mockPrisma.usageMetric.findFirst.mockResolvedValue(null);
      mockPrisma.usageMetric.create.mockResolvedValue({ id: 'metric-1', value: 1 });
    });

    it('should return true on first usage (creates metric)', async () => {
      const result = await service.enforceUsageQuota(orgId, feature, metric);
      expect(result).toBe(true);
      expect(mockPrisma.usageMetric.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: orgId,
          metricName: metric,
          value: 1,
        }),
      });
    });

    it('should increment usage when existing metric found', async () => {
      const existingUsage = { id: 'metric-1', value: 5 };
      mockPrisma.usageMetric.findFirst.mockResolvedValue(existingUsage);
      mockPrisma.usageMetric.update.mockResolvedValue({ id: 'metric-1', value: 6 });

      const result = await service.enforceUsageQuota(orgId, feature, metric);

      expect(result).toBe(true);
      expect(mockPrisma.usageMetric.update).toHaveBeenCalledWith({
        where: { id: 'metric-1' },
        data: { value: 6 },
      });
    });

    it('should throw ForbiddenException when feature flag is disabled', async () => {
      mockPrisma.featureFlag.findFirst.mockResolvedValue({
        featureName: feature,
        organizationId: orgId,
        isEnabled: false,
      });

      await expect(service.enforceUsageQuota(orgId, feature, metric)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should not throw when feature flag is enabled', async () => {
      mockPrisma.featureFlag.findFirst.mockResolvedValue({
        featureName: feature,
        organizationId: orgId,
        isEnabled: true,
      });

      const result = await service.enforceUsageQuota(orgId, feature, metric);
      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when no subscription found', async () => {
      mockPrisma.organizationSubscription.findUnique.mockResolvedValue(null);

      await expect(service.enforceUsageQuota(orgId, feature, metric)).rejects.toThrow(
        new ForbiddenException('Active subscription required.'),
      );
    });

    it('should throw ForbiddenException when subscription is CANCELLED', async () => {
      mockPrisma.organizationSubscription.findUnique.mockResolvedValue({
        organizationId: orgId,
        planId: 'plan-pro',
        status: 'CANCELLED',
      });

      await expect(service.enforceUsageQuota(orgId, feature, metric)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when EXPIRED subscription', async () => {
      mockPrisma.organizationSubscription.findUnique.mockResolvedValue({
        organizationId: orgId,
        planId: 'plan-pro',
        status: 'EXPIRED',
      });

      await expect(service.enforceUsageQuota(orgId, feature, metric)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when usage limit is reached', async () => {
      mockPrisma.subscriptionPlan.findUnique.mockResolvedValue({
        id: 'plan-starter',
        limits: { ocr_calls: 10 },
      });
      mockPrisma.usageMetric.findFirst.mockResolvedValue({
        id: 'metric-1',
        value: 10,
      });

      await expect(service.enforceUsageQuota(orgId, feature, 'OCR_CALLS')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow when limit is 0 (unlimited plan)', async () => {
      mockPrisma.subscriptionPlan.findUnique.mockResolvedValue({
        id: 'plan-unlimited',
        limits: {},
      });
      mockPrisma.usageMetric.findFirst.mockResolvedValue({ id: 'metric-1', value: 99999 });
      mockPrisma.usageMetric.update.mockResolvedValue({ id: 'metric-1', value: 100000 });

      const result = await service.enforceUsageQuota(orgId, feature, metric);
      expect(result).toBe(true);
    });

    it('should handle null plan limits object gracefully', async () => {
      mockPrisma.subscriptionPlan.findUnique.mockResolvedValue({
        id: 'plan-free',
        limits: null,
      });

      const result = await service.enforceUsageQuota(orgId, feature, metric);
      expect(result).toBe(true);
    });

    it('should handle null plan (plan not found)', async () => {
      mockPrisma.subscriptionPlan.findUnique.mockResolvedValue(null);

      const result = await service.enforceUsageQuota(orgId, feature, metric);
      expect(result).toBe(true);
    });
  });
});
