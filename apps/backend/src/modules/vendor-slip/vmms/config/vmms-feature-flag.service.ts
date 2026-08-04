import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VmmsFeatureFlagService {
  constructor(private readonly configService: ConfigService) {}

  public isVmmsEnabled(): boolean {
    return this.configService.get<string>('VMMS_ENABLED') === 'true';
  }

  public isShadowMatcherEnabled(): boolean {
    if (!this.isVmmsEnabled()) {
      return false;
    }
    return this.configService.get<string>('VMMS_MATCHER_ENABLED') === 'true';
  }

  public isDualWriteEnabled(): boolean {
    if (!this.isShadowMatcherEnabled()) {
      return false;
    }
    return this.configService.get<string>('VMMS_DUAL_WRITE_ENABLED') === 'true';
  }

  public isDebugEnabled(): boolean {
    if (!this.isVmmsEnabled()) {
      return false;
    }
    return this.configService.get<string>('VMMS_DEBUG_MATCHING') === 'true';
  }

  public isVmmsActiveEnforcementEnabled(): boolean {
    if (!this.isDualWriteEnabled()) {
      return false;
    }
    return (
      this.configService.get<string>('VMMS_ACTIVE_ENFORCEMENT_ENABLED') ===
      'true'
    );
  }
}
