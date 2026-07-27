import { Controller, Get, Put, Body } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Controller('admin')
export class AdminConfigController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('config')
  async getConfig() {
    // Only return safe configuration without exposing secrets
    return {
      ocrProvider: 'AZURE_DOCUMENT_INTELLIGENCE',
      aiProvider: 'OPENAI',
      gmailIntegration: 'DISCONNECTED', // (implementation note)
      retryLimits: {
        erpSync: 5,
        emailProcessing: 3,
      },
      matchingThresholds: {
        student: 0.8,
        vendor: 0.85,
      },
      queueLimits: {
        maxActiveJobs: 50,
        rateLimit: 100,
      },
    };
  }

  @Put('config')
  async updateConfig(@Body() body: any) {
    // In a real scenario, this would validate and save to DB
    // Phase 8 mandate: Secrets must remain environment variables.
    return {
      message: 'Configuration updated successfully (Simulated)',
      updatedFields: Object.keys(body),
    };
  }
}
