import { Controller, Get } from '@nestjs/common';
import { CapabilityRegistryService } from '../services/capability-registry.service';

@Controller('system')
export class CapabilityController {
  constructor(private readonly registryService: CapabilityRegistryService) {}

  @Get('capabilities')
  async getCapabilities() {
    return this.registryService.getCapabilities();
  }
}
