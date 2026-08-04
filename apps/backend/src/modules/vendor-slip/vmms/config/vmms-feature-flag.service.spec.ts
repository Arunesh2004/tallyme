import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { VmmsFeatureFlagService } from './vmms-feature-flag.service';

describe('VmmsFeatureFlagService', () => {
  let service: VmmsFeatureFlagService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VmmsFeatureFlagService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VmmsFeatureFlagService>(VmmsFeatureFlagService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('Precedence Logic', () => {
    it('should return false for everything if master flag is off', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'VMMS_ENABLED') return 'false';
        return 'true'; // All other flags claim to be true
      });

      expect(service.isVmmsEnabled()).toBe(false);
      expect(service.isShadowMatcherEnabled()).toBe(false);
      expect(service.isDualWriteEnabled()).toBe(false);
      expect(service.isDebugEnabled()).toBe(false);
    });

    it('should allow matcher to be off while master is on', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'VMMS_ENABLED') return 'true';
        if (key === 'VMMS_MATCHER_ENABLED') return 'false';
        return 'true';
      });

      expect(service.isVmmsEnabled()).toBe(true);
      expect(service.isShadowMatcherEnabled()).toBe(false);
      expect(service.isDualWriteEnabled()).toBe(false); // Cascades from matcher being off
    });

    it('should allow shadow execution with dual write off', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'VMMS_ENABLED') return 'true';
        if (key === 'VMMS_MATCHER_ENABLED') return 'true';
        if (key === 'VMMS_DUAL_WRITE_ENABLED') return 'false';
        return 'false';
      });

      expect(service.isVmmsEnabled()).toBe(true);
      expect(service.isShadowMatcherEnabled()).toBe(true);
      expect(service.isDualWriteEnabled()).toBe(false);
    });

    it('should enable dual write when all precedence flags are true', () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'VMMS_ENABLED') return 'true';
        if (key === 'VMMS_MATCHER_ENABLED') return 'true';
        if (key === 'VMMS_DUAL_WRITE_ENABLED') return 'true';
        return 'false';
      });

      expect(service.isVmmsEnabled()).toBe(true);
      expect(service.isShadowMatcherEnabled()).toBe(true);
      expect(service.isDualWriteEnabled()).toBe(true);
    });
  });
});
