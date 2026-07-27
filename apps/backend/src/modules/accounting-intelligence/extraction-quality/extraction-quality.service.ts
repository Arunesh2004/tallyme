import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AccountingDecisionAuditService } from '../decision-audit/accounting-decision-audit.service';

@Injectable()
export class ExtractionQualityService {
  private readonly logger = new Logger(ExtractionQualityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AccountingDecisionAuditService,
  ) {}

  async evaluateExtraction(
    documentId: string,
    extractions: Array<{
      fieldName: string;
      value: string;
      confidence: number;
      sourceText: string;
    }>,
  ) {
    this.logger.log(`Evaluating extraction quality for Document ${documentId}`);

    const policies = await this.prisma.confidencePolicy.findMany();
    const policyMap = new Map(policies.map((p: any) => [p.fieldName, p]));

    let overallReviewRequired = false;

    for (const field of extractions) {
      let validationStatus = 'APPROVED';
      let reviewRequired = false;
      let reviewReason = null;

      const policy = policyMap.get(field.fieldName);

      if (policy && field.confidence < policy.minimumConfidence) {
        validationStatus = 'REVIEW_REQUIRED';
        reviewRequired = true;
        reviewReason = `Confidence (${(field.confidence * 100).toFixed(1)}%) below required threshold (${(policy.minimumConfidence * 100).toFixed(1)}%)`;
        overallReviewRequired = true;
      }

      await this.prisma.extractionFieldConfidence.create({
        data: {
          documentId,
          fieldName: field.fieldName,
          extractedValue: field.value,
          normalizedValue: field.value,
          confidenceScore: field.confidence,
          sourceText: field.sourceText,
          validationStatus,
          reviewRequired,
          reviewReason,
          modelVersion: 'v2-production',
          promptVersion: 'v1.4',
        },
      });

      if (reviewRequired) {
        // Create an accounting exception representing this low confidence
        await this.prisma.accountingException.create({
          data: {
            entityType: 'DOCUMENT',
            entityId: documentId,
            exceptionType: 'LOW_EXTRACTION_CONFIDENCE',
            severity: policy?.criticality || 'MEDIUM',
            description: `Field ${field.fieldName} failed confidence check. ${reviewReason}`,
            status: 'OPEN',
          },
        });
      }
    }

    return { overallReviewRequired };
  }
}
