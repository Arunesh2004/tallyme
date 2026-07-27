import { Controller, Post, Body } from '@nestjs/common';
import { TallyDiscoveryService } from './tally-discovery.service';

@Controller('accounting-intelligence/discovery')
export class TallyDiscoveryController {
  constructor(private readonly discoveryService: TallyDiscoveryService) {}

  @Post('run')
  async runDiscovery(@Body('companyId') companyId: string) {
    if (!companyId) {
      return { status: 'ERROR', message: 'companyId is required' };
    }
    const reportId = await this.discoveryService.runDiscovery(
      companyId,
      'system-user',
    );
    return {
      status: 'SUCCESS',
      message: 'Discovery completed successfully in read-only mode',
      reportId: reportId,
    };
  }
}
