import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { IManualReviewRepository } from '../interfaces/manual-review.repository.interface';
import { Prisma } from '@prisma/client';

@Injectable()
export class PrismaManualReviewRepository implements IManualReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any): Promise<any> {
    // Check if task exists for this entity to prevent duplicate manual review tasks
    const existing = await this.prisma.manualReviewTask.findFirst({
      where: {
        entityType: data.entityType,
        entityId: data.entityId,
        status: 'PENDING'
      }
    });

    if (existing) return existing;

    return await this.prisma.manualReviewTask.create({
      data
    });
  }

  async assign(id: string, userId: string): Promise<any> {
    return await this.prisma.manualReviewTask.update({
      where: { id },
      data: { assignedTo: userId }
    });
  }

  async resolve(id: string, resolution: string, tx?: any): Promise<any> {
    const client = tx || this.prisma;
    return await client.manualReviewTask.update({
      where: { id },
      data: { 
        status: 'RESOLVED',
        resolution
      }
    });
  }

  async reject(id: string, resolution: string, tx?: any): Promise<any> {
    const client = tx || this.prisma;
    return await client.manualReviewTask.update({
      where: { id },
      data: { 
        status: 'REJECTED',
        resolution
      }
    });
  }

  async findPending(limit = 10, offset = 0): Promise<any[]> {
    return this.prisma.manualReviewTask.findMany({
      where: { status: 'PENDING' },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' }
    });
  }
}
