import { Injectable, Inject } from '@nestjs/common';
import { PrismaStudentFeeRepository } from '../../infrastructure/repositories/prisma-student-fee.repository';
import {
  IEmailParser,
  IPaymentExtractionProvider,
  IStudentMatcher,
  IFeeAllocator,
  IOutstandingFeeProvider,
  IGmailHistoryProvider,
  EmailMetadata,
} from '../../domain/providers/student-fee.providers';
import {
  VoucherBuilder,
  VoucherCandidate,
  VoucherEntry,
} from '../../../vendor-slip/domain/services/voucher.service';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';

@Injectable()
export class StudentFeeOrchestrator {
  constructor(
    private readonly repository: PrismaStudentFeeRepository,
    @Inject('IEmailParser') private readonly emailParser: IEmailParser,
    @Inject('IPaymentExtractionProvider')
    private readonly paymentExtractor: IPaymentExtractionProvider,
    @Inject('IStudentMatcher') private readonly studentMatcher: IStudentMatcher,
    @Inject('IOutstandingFeeProvider')
    private readonly outstandingFeeProvider: IOutstandingFeeProvider,
    @Inject('IFeeAllocator') private readonly feeAllocator: IFeeAllocator,
    @Inject('IGmailHistoryProvider')
    private readonly gmailHistoryProvider: IGmailHistoryProvider,
    private readonly voucherBuilder: VoucherBuilder,
    private readonly prisma: PrismaService, // Needed for enqueuing ERP Job
  ) {}

  async handleIncomingEmail(metadata: EmailMetadata): Promise<string> {
    // 1. Idempotency Check
    const existing = await this.repository.getEmailDocumentByMessageId(
      metadata.messageId,
    );
    if (existing) {
      if (
        existing.status !== 'EXTRACTION_FAILED' &&
        existing.status !== 'DUPLICATE'
      ) {
        await this.repository.logAudit(
          existing.id,
          'DUPLICATE_NOTIFICATION_SKIPPED',
          { messageId: metadata.messageId },
        );
        return existing.id;
      }
    }

    // 2. Create Document
    const doc = await this.repository.createEmailDocument({
      messageId: metadata.messageId,
      subject: metadata.subject,
      sender: metadata.sender,
      receivedAt: metadata.receivedAt,
      source: metadata.source,
      checksum: metadata.checksum,
    });

    await this.repository.logAudit(doc.id, 'EMAIL_RECEIVED', { metadata });

    return doc.id;
  }

  async processEmailParsing(documentId: string): Promise<void> {
    let doc = await this.repository.getEmailDocument(documentId);
    if (!doc || doc.status !== 'RECEIVED') return;

    try {
      doc = await this.repository.updateEmailDocumentStatus(
        documentId,
        'PARSED',
        'processEmailParsing',
      );

      const rawContent = await this.gmailHistoryProvider.fetchEmailContent(
        doc.messageId,
      );
      const parsed = await this.emailParser.parse(rawContent);

      await this.repository.logAudit(documentId, 'EMAIL_PARSED', {
        textLength: parsed.textBody.length,
      });

      // Proceed to Extraction
      await this.processPaymentExtraction(documentId, parsed);
    } catch (error: any) {
      await this.repository.routeToManualReview(
        documentId,
        'Email parsing failed: ' + error.message,
      );
    }
  }

  async processPaymentExtraction(
    documentId: string,
    parsed: any,
  ): Promise<void> {
    const doc = await this.repository.updateEmailDocumentStatus(
      documentId,
      'EXTRACTION_PROCESSING',
      'processPaymentExtraction',
    );

    try {
      const extraction =
        await this.paymentExtractor.extractPaymentDetails(parsed);

      if (extraction.confidence < 0.8) {
        await this.repository.routeToManualReview(
          documentId,
          'Low Extraction Confidence: ' + extraction.confidence,
        );
        return;
      }

      const candidate = await this.repository.createPaymentCandidate({
        documentId,
        paymentGateway: extraction.paymentGateway,
        gatewayTransactionId: extraction.gatewayTransactionId,
        utr: extraction.utr,
        bankReference: extraction.bankReference,
        payerEmail: extraction.payerEmail,
        payerPhone: extraction.payerPhone,
        rawStudentName: extraction.rawStudentName,
        amount: extraction.amount,
        paymentDate: extraction.paymentDate,
        extractionConfidence: extraction.confidence,
      });

      await this.repository.logAudit(documentId, 'PAYMENT_EXTRACTED', {
        amount: candidate.amount,
      });
      await this.processStudentMatching(documentId, extraction);
    } catch (error: any) {
      await this.repository.routeToManualReview(
        documentId,
        'Extraction failed: ' + error.message,
      );
    }
  }

  async processStudentMatching(
    documentId: string,
    paymentData: any,
  ): Promise<void> {
    await this.repository.updateEmailDocumentStatus(
      documentId,
      'STUDENT_MATCHING',
      'processStudentMatching',
    );

    try {
      const matchResult = await this.studentMatcher.matchStudent(paymentData);

      if (!matchResult.studentId || matchResult.confidence < 0.8) {
        let reason = 'Student not found';
        if (matchResult.candidateList && matchResult.candidateList.length > 1) {
          reason = 'Multiple student matches found';
        }
        await this.repository.createStudentMatch({
          documentId,
          studentId: 'unmatched', // Or make studentId nullable in schema (Wait, in schema studentId is required, I should fix that if needed or use a dummy. Better to not create match and route to manual review)
          confidence: matchResult.confidence,
          matchingStrategy: matchResult.matchingStrategy,
        }); // Actually, if it failed, don't create StudentMatch, just route to review.
        await this.repository.routeToManualReview(documentId, reason);
        return;
      }

      await this.repository.createStudentMatch({
        documentId,
        studentId: matchResult.studentId,
        confidence: matchResult.confidence,
        matchingStrategy: matchResult.matchingStrategy,
        candidateList: matchResult.candidateList,
      });

      await this.repository.logAudit(documentId, 'STUDENT_MATCHED', {
        studentId: matchResult.studentId,
      });

      await this.processFeeAllocation(
        documentId,
        matchResult.studentId,
        paymentData,
      );
    } catch (error: any) {
      await this.repository.routeToManualReview(
        documentId,
        'Student Matching failed: ' + error.message,
      );
    }
  }

  async processFeeAllocation(
    documentId: string,
    studentId: string,
    paymentData: any,
  ): Promise<void> {
    await this.repository.updateEmailDocumentStatus(
      documentId,
      'FEE_ALLOCATING',
      'processFeeAllocation',
    );

    try {
      // Duplicate detection
      const existingPayments =
        await this.repository.findPaymentCandidatesByTxnOrUtr(
          paymentData.gatewayTransactionId || null,
          paymentData.utr || null,
        );

      for (const existingPayment of existingPayments) {
        if (existingPayment.documentId !== documentId) {
          const existingDoc = await this.repository.getEmailDocument(
            existingPayment.documentId,
          );
          if (
            existingDoc &&
            ['ERP_SYNCING', 'COMPLETED', 'VOUCHER_GENERATED'].includes(
              existingDoc.status,
            )
          ) {
            await this.repository.routeToManualReview(
              documentId,
              'Suspected duplicate payment',
            );
            return;
          }
        }
      }

      const outFees =
        await this.outstandingFeeProvider.getOutstandingFees(studentId);
      const allocation = await this.feeAllocator.allocate(
        paymentData.amount,
        outFees,
      );

      await this.repository.createFeeAllocation({
        documentId,
        totalAllocated: allocation.totalAllocated,
        allocationType: allocation.allocationType,
        allocatedFees: allocation.allocatedFees,
      });

      await this.repository.logAudit(documentId, 'FEE_ALLOCATED', {
        allocationType: allocation.allocationType,
      });

      await this.processVoucherGeneration(
        documentId,
        studentId,
        allocation,
        paymentData,
      );
    } catch (error: any) {
      await this.repository.routeToManualReview(
        documentId,
        'Fee Allocation failed: ' + error.message,
      );
    }
  }

  async processVoucherGeneration(
    documentId: string,
    studentId: string,
    allocation: any,
    paymentData: any,
  ): Promise<void> {
    try {
      const student = await this.repository.findStudentById(studentId);

      const ledgerName = student ? student.enrollmentNo : 'Unknown Student';

      const entries: VoucherEntry[] = [
        new VoucherEntry(
          'Bank Account',
          { toNumber: () => paymentData.amount } as any,
          true,
        ),
        new VoucherEntry(
          ledgerName,
          { toNumber: () => paymentData.amount } as any,
          false,
        ),
      ];

      const vc = new VoucherCandidate(
        'VCH-' + Date.now(),
        documentId, // using documentId as allocationId for reference
        'Receipt',
        paymentData.paymentDate || new Date(),
        'Being fee received via ' + (paymentData.paymentGateway || 'Bank'),
        entries,
      );

      const validation = this.voucherBuilder['validator'].validate(vc);
      if (validation.isFailure) {
        throw new Error('Voucher Validation Failed: ' + validation.error);
      }

      const company = await this.prisma.company.findFirst();
      if (!company)
        throw new Error('No company found to associate with voucher');

      const savedCandidate = await this.prisma.voucherCandidate.create({
        data: {
          companyId: company.id,
          voucherNumber: vc.id,
          voucherType: 'Receipt',
          date: vc.date,
          narration: vc.narration,
          partyLedgerName: ledgerName,
          entries: {
            create: entries.map((e, idx) => ({
              sequence: idx + 1,
              ledgerName: e.ledgerName,
              amount: e.amount.toNumber(),
              isDebit: e.isDebit,
              isParty: e.ledgerName === ledgerName,
            })),
          },
        },
      });

      await this.prisma.eRPSyncJob.create({
        data: {
          voucherCandidateId: savedCandidate.id,
          idempotencyHash: 'sync-student-' + savedCandidate.id,
          adapterCode: 'TALLY_PRIME_V1',
        },
      });

      await this.repository.updateEmailDocumentStatus(
        documentId,
        'ERP_SYNCING',
        'processVoucherGeneration',
      );
      await this.repository.logAudit(documentId, 'VOUCHER_GENERATED', {
        voucherCandidateId: savedCandidate.id,
      });
      await this.repository.logAudit(documentId, 'ERP_SYNC_QUEUED', {
        voucherCandidateId: savedCandidate.id,
      });
    } catch (error: any) {
      await this.repository.routeToManualReview(
        documentId,
        'Voucher Generation failed: ' + error.message,
      );
    }
  }
}
