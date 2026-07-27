import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class VendorResolverService {
  private readonly logger = new Logger(VendorResolverService.name);

  constructor(private readonly prisma: PrismaService) {}

  async resolveVendor(
    vendorData: { name: string; gstin?: string; pan?: string; mobile?: string },
    companyId: string,
  ) {
    this.logger.log(`Resolving vendor: ${vendorData.name}`);

    // Priority 1: GSTIN Match
    if (vendorData.gstin) {
      // Stub: Search Tally for GSTIN
      // If found, return and create Mapping
    }

    // Priority 2: PAN Match
    if (vendorData.pan) {
      // Stub: Search Tally for PAN
    }

    // Priority 3: Mobile Match
    if (vendorData.mobile) {
      // Stub: Search Tally for Mobile
    }

    // Priority 4: Similarity Match
    const existingMappings = await this.prisma.tallyMasterMapping.findMany({
      where: { companyId, entityType: 'VENDOR' },
    });

    for (const mapping of existingMappings) {
      if (this.calculateSimilarity(vendorData.name, mapping.tallyName) > 0.9) {
        return {
          status: 'POSSIBLE_MATCH',
          message: `Similarity match (92%) with ${mapping.tallyName}. Needs approval.`,
          suggestion: mapping.tallyName,
        };
      }
    }

    // If missing
    return {
      status: 'MISSING',
      message: 'New Ledger Required',
      suggestion: {
        Name: vendorData.name,
        Group: 'Sundry Creditors',
      },
      requiresApproval: true,
    };
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Basic Jaccard similarity implementation
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    if (s1 === s2) return 1.0;
    if (s1.includes(s2) || s2.includes(s1)) return 0.92;
    
    const set1 = new Set(s1.split(' '));
    const set2 = new Set(s2.split(' '));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
  }
}
