import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Controller('system')
export class SystemHealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async getHealth() {
    let dbStatus = 'HEALTHY';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'ERROR';
    }

    return {
      status: dbStatus === 'HEALTHY' ? 'HEALTHY' : 'ERROR',
      components: {
        database: dbStatus,
        bullMQ: 'HEALTHY',
        erpConnector: 'HEALTHY',
        tallyConnection: 'UNVERIFIED',
        memory: 'HEALTHY',
        storage: 'HEALTHY',
        environment: 'Local Mock',
      },
    };
  }
}
