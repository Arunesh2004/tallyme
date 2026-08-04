import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../../infrastructure/database/prisma.service';
import { VendorMatchDecisionPayload } from './vmms-repository.types';
import { Prisma } from '@prisma/client';

@Injectable()
export class VmmsVendorMatchDecisionRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async exists(invoiceCandidateId: string): Promise<boolean> {
    const count = await this.prisma.vendorMatchDecision.count({
      where: { invoiceCandidateId },
    });
    return count > 0;
  }

  public async create(payload: VendorMatchDecisionPayload): Promise<void> {
    try {
      await this.prisma.vendorMatchDecision.create({
        data: {
          invoiceCandidateId: payload.invoiceCandidateId,
          selectedVendorLedgerId: payload.selectedVendorLedgerId,
          isAutomated: payload.isAutomated,
          matchEvidence: payload.matchEvidence,
        },
      });
    } catch (error: any) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return;
      }
      throw error;
    }
  }

  public async upsert(
    payload: VendorMatchDecisionPayload,
    tx?: any,
  ): Promise<void> {
    const db = tx || this.prisma;
    await db.vendorMatchDecision.upsert({
      where: { invoiceCandidateId: payload.invoiceCandidateId },
      create: {
        invoiceCandidateId: payload.invoiceCandidateId,
        selectedVendorLedgerId: payload.selectedVendorLedgerId,
        isAutomated: payload.isAutomated,
        matchEvidence: payload.matchEvidence,
      },
      update: {
        selectedVendorLedgerId: payload.selectedVendorLedgerId,
        isAutomated: payload.isAutomated,
        matchEvidence: payload.matchEvidence,
      },
    });
  }
}
