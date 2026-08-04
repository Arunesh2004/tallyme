import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  VendorMatchingConfig,
  defaultVendorMatchingConfig,
} from './vendor-matching.config';

export interface VendorPolicyDecision {
  decision: 'RESOLVED' | 'MANUAL_REVIEW' | 'CREATE_VENDOR';
  matchedVendor: any | null;
  confidence: number;
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reason: string;
  nextAction:
    'USE_EXISTING_VENDOR' | 'REQUEST_MANUAL_REVIEW' | 'CREATE_PENDING_VENDOR';
  auditLog: any;
}

@Injectable()
export class VendorIntelligenceService {
  private readonly logger = new Logger(VendorIntelligenceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async resolveVendor(
    companyId: string,
    candidateData: any,
    config: VendorMatchingConfig = defaultVendorMatchingConfig,
  ): Promise<VendorPolicyDecision> {
    const extractedGstin =
      candidateData.extractedGstin || candidateData.extractedData?.gstin;
    const extractedName =
      candidateData.extractedName || candidateData.extractedData?.vendorName;
    const extractedPan =
      candidateData.extractedPan || candidateData.extractedData?.pan;

    let matchedVendor = null;
    let matchMethod = 'NONE';
    let confidence = 0.0;
    let risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    let reason = 'No match found';
    let aliasUsed = null;
    let vendorStatus = 'NEW_VENDOR';

    // Fetch all active vendor ledgers for this company
    const vendors = await this.prisma.vendorLedger.findMany({
      where: { companyId, status: 'ACTIVE' },
      include: {
        vendorBranch: { include: { vendor: true } },
        aliases: true,
      },
    });

    // PHASE 1: GST RESOLUTION
    if (extractedGstin) {
      const gstMatches = vendors.filter(
        (v: any) =>
          v.vendorBranch.gstin === extractedGstin ||
          v.vendorBranch.vendor.gstin === extractedGstin,
      );

      if (gstMatches.length === 1) {
        matchedVendor = gstMatches[0];
        matchMethod = 'EXACT_GST_MATCH';
        vendorStatus = 'EXACT_GST_MATCH';
        confidence = 1.0;
        risk = 'LOW';
        reason = `Exact GST match on ${extractedGstin}`;
      } else if (gstMatches.length > 1) {
        matchMethod = 'AMBIGUOUS';
        vendorStatus = 'AMBIGUOUS';
        confidence = 0.0;
        risk = 'CRITICAL';
        reason = `Multiple GST matches found for ${extractedGstin}`;
      }
    }

    // PHASE 2 & 3 & 4: ALIAS, EXACT NAME, FUZZY
    if (matchMethod === 'NONE' && extractedName) {
      const normalizedQuery = this.normalizeName(extractedName);

      let bestMatch = null;
      let bestScore = 0;
      let bestMethod = '';
      let bestAlias = null;

      for (const vendor of vendors) {
        const canonical = vendor.vendorBranch.vendor.name || '';
        const aliases = vendor.aliases.map((a: any) => a.aliasText);
        const allNames = [canonical, ...aliases];

        for (const name of allNames) {
          const normalizedTarget = this.normalizeName(name);
          if (normalizedQuery === normalizedTarget) {
            const isAlias = name !== canonical;
            const score = 1.0;
            if (score > bestScore) {
              bestScore = score;
              bestMatch = vendor;
              bestMethod = isAlias ? 'ALIAS_MATCH' : 'EXACT_NAME_MATCH';
              bestAlias = isAlias ? name : null;
            }
          } else {
            const score = this.calculateSimilarity(
              normalizedQuery,
              normalizedTarget,
              config,
            );
            if (score > bestScore) {
              bestScore = score;
              bestMatch = vendor;
              bestMethod = 'FUZZY_MATCH';
              bestAlias = null;
            }
          }
        }
      }

      if (bestMatch && bestScore > 0) {
        if (bestMethod === 'ALIAS_MATCH' || bestMethod === 'EXACT_NAME_MATCH') {
          matchedVendor = bestMatch;
          matchMethod = bestMethod;
          vendorStatus = bestMethod;
          confidence = 1.0;
          risk = bestMethod === 'ALIAS_MATCH' ? 'LOW' : 'MEDIUM';
          reason = `${bestMethod} on ${bestAlias || bestMatch.vendorBranch.vendor.name}`;
          aliasUsed = bestAlias;
        } else if (bestScore >= config.manualReviewThreshold) {
          matchedVendor = bestMatch;
          matchMethod = 'FUZZY_MATCH';
          vendorStatus = 'FUZZY_MATCH';
          confidence = bestScore;
          risk = 'HIGH';
          reason = `Fuzzy match with score ${bestScore.toFixed(2)}`;
        }
      }
    }

    // PHASE 5: DUPLICATE DETECTOR
    const duplicatesFound = [];
    if (vendorStatus === 'NEW_VENDOR' || vendorStatus === 'FUZZY_MATCH') {
      for (const v of vendors) {
        if (v.id === matchedVendor?.id) continue;
        if (
          extractedGstin &&
          (v.vendorBranch.gstin === extractedGstin ||
            v.vendorBranch.vendor.gstin === extractedGstin)
        ) {
          duplicatesFound.push({
            type: 'GSTIN',
            value: extractedGstin,
            vendorId: v.id,
          });
        }
        if (extractedPan && v.vendorBranch.vendor.pan === extractedPan) {
          duplicatesFound.push({
            type: 'PAN',
            value: extractedPan,
            vendorId: v.id,
          });
        }
      }
    }

    // GST CONFLICT CHECK
    if (
      matchedVendor &&
      extractedGstin &&
      matchMethod !== 'EXACT_GST_MATCH' &&
      matchMethod !== 'AMBIGUOUS'
    ) {
      const vendorGstin =
        matchedVendor.vendorBranch.gstin ||
        matchedVendor.vendorBranch.vendor.gstin;
      if (vendorGstin && vendorGstin !== extractedGstin) {
        risk = 'CRITICAL';
        vendorStatus = 'GST_CONFLICT';
        reason = `GST Conflict: Extracted ${extractedGstin}, Vendor has ${vendorGstin}`;
      }
    }

    if (duplicatesFound.length > 0) {
      risk = 'CRITICAL';
      vendorStatus = 'DUPLICATE_VENDOR';
      reason = `Duplicates found: ${duplicatesFound.map((d: any) => d.type).join(', ')}`;
    }

    // PHASE 8 & 9: POLICY ENGINE & VENDOR CREATION CANDIDATE
    let decision: 'RESOLVED' | 'MANUAL_REVIEW' | 'CREATE_VENDOR';
    let nextAction:
      'USE_EXISTING_VENDOR' | 'REQUEST_MANUAL_REVIEW' | 'CREATE_PENDING_VENDOR';

    if (risk === 'CRITICAL') {
      decision = 'MANUAL_REVIEW';
      nextAction = 'REQUEST_MANUAL_REVIEW';
    } else if (confidence >= config.autoResolveThreshold) {
      decision = 'RESOLVED';
      nextAction = 'USE_EXISTING_VENDOR';
    } else if (confidence >= config.manualReviewThreshold) {
      decision = 'MANUAL_REVIEW';
      nextAction = 'REQUEST_MANUAL_REVIEW';
    } else {
      decision = 'CREATE_VENDOR';
      nextAction = 'CREATE_PENDING_VENDOR';
      matchedVendor = null;
    }

    // PHASE 10: AUDIT LOG
    const auditLog = {
      vendorName: extractedName,
      normalizedName: extractedName ? this.normalizeName(extractedName) : null,
      gstin: extractedGstin,
      aliasMatched: aliasUsed,
      matchedVendor: matchedVendor
        ? { id: matchedVendor.id, name: matchedVendor.vendorBranch.vendor.name }
        : null,
      confidence,
      risk,
      matchMethod,
      duplicatesFound,
      finalDecision: decision,
      reason,
      timestamp: new Date().toISOString(),
    };

    return {
      decision,
      matchedVendor,
      confidence,
      risk,
      reason,
      nextAction,
      auditLog,
    };
  }

  // PHASE 3: NAME NORMALIZATION
  private normalizeName(name: string): string {
    if (!name) return '';
    let norm = name.toUpperCase();

    // Remove punctuation
    norm = norm.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ');

    // Normalize spaces
    norm = norm.replace(/\s{2,}/g, ' ').trim();

    // Abbreviations
    const tokens = norm.split(' ');
    const map: Record<string, string> = {
      'M/S': '',
      MS: '',
      PVT: 'PRIVATE',
      LTD: 'LIMITED',
      CO: 'COMPANY',
    };

    const mapped = tokens
      .map((t) => (map[t] !== undefined ? map[t] : t))
      .filter((t) => t !== '');
    return mapped.join(' ');
  }

  // PHASE 4: MULTI-FACTOR SIMILARITY ENGINE
  private calculateSimilarity(
    str1: string,
    str2: string,
    config: VendorMatchingConfig,
  ): number {
    if (!str1 || !str2) return 0;

    const equality = str1 === str2 ? 1.0 : 0.0;

    const tokens1 = new Set(str1.split(' '));
    const tokens2 = new Set(str2.split(' '));
    const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));
    const overlap = intersection.size / Math.max(tokens1.size, tokens2.size);

    const lev = this.levenshteinSimilarity(str1, str2);

    let prefixSuffix = 0.0;
    if (
      str1.startsWith(str2) ||
      str2.startsWith(str1) ||
      str1.endsWith(str2) ||
      str2.endsWith(str1)
    ) {
      prefixSuffix = 1.0;
    }

    const w = config.signalWeights;
    const finalScore =
      equality * w.normalizedEquality +
      overlap * w.tokenOverlap +
      lev * w.levenshtein +
      prefixSuffix * w.prefixSuffix;

    return finalScore;
  }

  private levenshteinSimilarity(s1: string, s2: string): number {
    if (s1 === s2) return 1.0;
    const len1 = s1.length;
    const len2 = s2.length;
    if (len1 === 0) return 0.0;
    if (len2 === 0) return 0.0;

    const matrix = [];
    for (let i = 0; i <= len1; i++) matrix[i] = [i];
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (s1.charAt(i - 1) === s2.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1),
          );
        }
      }
    }
    const dist = matrix[len1][len2];
    const maxLen = Math.max(len1, len2);
    return (maxLen - dist) / maxLen;
  }
}
