import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export interface HealthStatus {
  status: 'UP' | 'DOWN';
  latencyMs: number;
  message?: string;
}

@Injectable()
export class PrismaHealthIndicator {
  constructor(private readonly prisma: PrismaService) {}

  async checkHealth(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      // Execute a simple query to verify connection
      await this.prisma.client.$queryRaw`SELECT 1`;
      const latencyMs = Date.now() - start;
      return { status: 'UP', latencyMs };
    } catch (error) {
      return { 
        status: 'DOWN', 
        latencyMs: Date.now() - start, 
        message: 'Database connection failed' 
      };
    }
  }
}
