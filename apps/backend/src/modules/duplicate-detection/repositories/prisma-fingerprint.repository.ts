import { Injectable } from '@nestjs/common';
import { InvoiceFingerprint } from '@prisma/client';
import { FingerprintRepository, CandidateCriteria } from '../interfaces/fingerprint-repository.interface';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class PrismaFingerprintRepository implements FingerprintRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findCandidates(
    tenantId: string,
    criteria: CandidateCriteria
  ): Promise<ReadonlyArray<Readonly<InvoiceFingerprint>>> {
    const whereClause: any = {
      tenantId
    };

    if (criteria.vendorId) {
      whereClause.vendorId = criteria.vendorId;
    }

    if (criteria.normalizedVendorName) {
      whereClause.normalizedVendorName = criteria.normalizedVendorName;
    }

    const candidates = await this.prisma.invoiceFingerprint.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      },
      take: 1000
    });

    // Deep freeze results to enforce immutability as per contract
    return Object.freeze(
      candidates.map(candidate => Object.freeze(candidate))
    ) as ReadonlyArray<Readonly<InvoiceFingerprint>>;
  }

  async create(
    fingerprint: Omit<InvoiceFingerprint, 'id' | 'createdAt' | 'updatedAt'>,
    tx?: any
  ): Promise<InvoiceFingerprint> {
    const client = tx || this.prisma;
    
    // Ensure decisionMetadata is properly handled as JSON
    const data: any = { ...fingerprint };
    if (data.decisionMetadata === undefined) {
      data.decisionMetadata = null;
    }

    return await client.invoiceFingerprint.create({
      data
    });
  }
}
