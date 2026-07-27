import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Injectable()
export class VendorIntelligenceEngine {
  private readonly logger = new Logger(VendorIntelligenceEngine.name);

  constructor(private readonly prisma: PrismaService) {}

  async evaluateVendor(extractedName: string, extractedGstin?: string) {
    this.logger.log(`Evaluating vendor: ${extractedName}`);

    let matchConfidence = 0;
    let suggestedVendorId: string | null = null;
    const suggestedLedger: string | null = null;

    // 1. Exact GSTIN match
    if (extractedGstin) {
      const vendor = await this.prisma.vendor.findFirst({
        where: { gstin: extractedGstin },
      });
      if (vendor) {
        matchConfidence = 0.99;
        suggestedVendorId = vendor.id;
        return {
          matchConfidence,
          suggestedVendorId,
          suggestedLedger,
          method: 'GSTIN_EXACT',
        };
      }
    }

    // 2. Similarity Name Match (simulated with ILike or exact for now)
    const vendorByName = await this.prisma.vendor.findFirst({
      where: {
        name: { contains: extractedName, mode: 'insensitive' },
      },
    });

    if (vendorByName) {
      // Very basic similarity mock based on lengths
      const lengthRatio = vendorByName.name
        ? Math.min(extractedName.length, vendorByName.name.length) /
          Math.max(extractedName.length, vendorByName.name.length)
        : 0;
      matchConfidence = lengthRatio * 0.9; // max 90% confidence on name alone
      suggestedVendorId = vendorByName.id;
      return {
        matchConfidence,
        suggestedVendorId,
        suggestedLedger,
        method: 'NAME_SIMILARITY',
      };
    }

    return {
      matchConfidence: 0.1,
      suggestedVendorId: null,
      suggestedLedger: null,
      method: 'NO_MATCH',
    };
  }
}
