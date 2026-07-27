import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

export interface CreateApprovalRequestDto {
  companyId?: string;
  type: string;
  entityId?: string;
  reason: string;
  requestedBy?: string;
}

@Injectable()
export class ApprovalWorkflowEngine {
  constructor(private readonly prisma: PrismaService) {}

  async createApprovalRequest(data: CreateApprovalRequestDto) {
    return this.prisma.approvalRequest.create({
      data: {
        ...data,
        status: 'PENDING',
      },
    });
  }

  async approve(id: string, approvedBy: string) {
    return this.prisma.approvalRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy,
        resolvedAt: new Date(),
      },
    });
  }

  async reject(id: string, rejectedBy: string) {
    return this.prisma.approvalRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedBy: rejectedBy, // Can reuse approvedBy for resolver
        resolvedAt: new Date(),
      },
    });
  }
}
