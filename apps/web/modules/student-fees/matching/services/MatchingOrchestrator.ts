import { prisma } from '../../../../shared/db/prisma';
import { FingerprintGenerator } from './FingerprintGenerator';
import { WeightedMatchingStrategy, ParsedPayment, MatchCandidate } from '../strategies/WeightedMatchingStrategy';
import { MatchingResult } from '../types/MatchingResult';
import { StudentMatched, StudentMatchFailed, DuplicatePaymentDetected, ManualReviewCreated, PaymentValidated } from '../events/MatchingEvents';
import { v4 as uuidv4 } from 'uuid';
import { EventStatus } from '@prisma/client';
import { logger } from '../../../../shared/logging/logger';

export class MatchingOrchestrator {
  private strategy: WeightedMatchingStrategy;

  constructor() {
    this.strategy = new WeightedMatchingStrategy();
  }

  public async processPayment(payment: ParsedPayment): Promise<void> {
    const fingerprint = FingerprintGenerator.generate(
      payment.admissionNumber,
      payment.utr,
      payment.amount,
      payment.feeMonth,
      payment.gateway
    );

    // 1. Duplicate Detection
    const isDuplicate = await this.checkDuplicate(fingerprint);
    if (isDuplicate) {
      await this.handleDuplicate(payment, fingerprint);
      return;
    }

    // 2. Locate Student
    const match = await this.strategy.findMatch(payment);
    if (!match || match.confidence < 80) { // Threshold
      await this.handleFailedMatch(payment, match, fingerprint);
      return;
    }

    // 3. Validation & Amounts
    await this.validateAndFinalize(payment, match, fingerprint);
  }

  private async checkDuplicate(fingerprint: string): Promise<boolean> {
    // Note: Assuming a schema addition in the future that stores successful Payment fingerprints,
    // or querying `ManualReview` to see if this fingerprint is already under review.
    // For now, we simulate checking a hypothetical `PaymentRecord` table.
    // Since we don't have PaymentRecord yet, we check ManualReview for duplicates.
    const exists = await prisma.manualReview.findFirst({
      where: {
        payload: {
          path: ['paymentFingerprint'],
          equals: fingerprint
        }
      }
    });
    return !!exists;
  }

  private async handleDuplicate(payment: ParsedPayment, fingerprint: string): Promise<void> {
    logger.warn(`Duplicate Payment Detected: ${fingerprint}`);
    const event = new DuplicatePaymentDetected(fingerprint, 'Payment', { ...payment, fingerprint }, uuidv4());
    await this.publishEvent(event);
  }

  private async handleFailedMatch(payment: ParsedPayment, match: MatchCandidate | null, fingerprint: string): Promise<void> {
    logger.warn(`Student Match Failed for UTR: ${payment.utr}`);
    
    await prisma.$transaction(async (tx) => {
      // Create Manual Review Queue item
      const review = await tx.manualReview.create({
        data: {
          type: 'MATCHING_FAILURE',
          reason: `Confidence too low (${match?.confidence || 0}) or student not found.`,
          payload: { ...payment, paymentFingerprint: fingerprint, highestConfidenceCandidate: match?.student?.id },
          organizationId: 'org_default'
        }
      });

      const event = new ManualReviewCreated(review.id, 'ManualReview', review, uuidv4());
      
      await tx.eventOutbox.create({
        data: {
          eventId: uuidv4(),
          aggregateId: event.aggregateId,
          aggregateType: event.aggregateType,
          eventType: event.eventType,
          payload: JSON.parse(JSON.stringify(event.payload)),
          correlationId: event.correlationId,
          status: EventStatus.PENDING,
          organizationId: 'org_default'
        }
      });
    });
  }

  private async validateAndFinalize(payment: ParsedPayment, match: MatchCandidate, fingerprint: string): Promise<void> {
    const student = match.student;
    
    // Calculate expected amount
    let expectedAmount = 0;
    if (student.feeStructure) {
      const fs = student.feeStructure;
      expectedAmount = Number(fs.tuitionFee) + Number(fs.transportFee) + Number(fs.hostelFee) + Number(fs.computerFee) + Number(fs.examinationFee) + Number(fs.annualFee) + Number(fs.miscellaneousFee);
    }

    const paidAmount = Number(payment.amount);
    const balanceAmount = expectedAmount - paidAmount;
    
    const result: MatchingResult = {
      status: balanceAmount === 0 ? 'MATCHED' : 'MANUAL_REVIEW',
      studentId: student.id,
      admissionNumber: student.admissionNumber,
      studentName: student.studentName,
      matchedFeeMonth: payment.feeMonth,
      expectedAmount,
      paidAmount,
      balanceAmount,
      confidence: match.confidence,
      requiresManualReview: balanceAmount !== 0 || student.status !== 'ACTIVE',
      reason: student.status !== 'ACTIVE' ? 'Student is INACTIVE' : (balanceAmount < 0 ? 'OVERPAYMENT' : (balanceAmount > 0 ? 'PARTIAL_PAYMENT' : 'EXACT_MATCH')),
      paymentFingerprint: fingerprint
    };

    await prisma.$transaction(async (tx) => {
      if (result.requiresManualReview) {
        const review = await tx.manualReview.create({
          data: {
            type: balanceAmount < 0 ? 'OVERPAYMENT' : (student.status !== 'ACTIVE' ? 'INACTIVE_STUDENT' : 'PARTIAL_PAYMENT'),
            reason: result.reason!,
            payload: JSON.parse(JSON.stringify(result)),
            organizationId: student.organizationId
          }
        });
        const event = new ManualReviewCreated(review.id, 'ManualReview', result, uuidv4());
        await tx.eventOutbox.create({
          data: {
            eventId: uuidv4(),
            aggregateId: event.aggregateId,
            aggregateType: event.aggregateType,
            eventType: event.eventType,
            payload: JSON.parse(JSON.stringify(event.payload)),
            correlationId: event.correlationId,
            status: EventStatus.PENDING,
            organizationId: student.organizationId
          }
        });
      } else {
        const event = new StudentMatched(student.id, 'Payment', result, uuidv4());
        await tx.eventOutbox.create({
          data: {
            eventId: uuidv4(),
            aggregateId: event.aggregateId,
            aggregateType: event.aggregateType,
            eventType: event.eventType,
            payload: JSON.parse(JSON.stringify(event.payload)),
            correlationId: event.correlationId,
            status: EventStatus.PENDING,
            organizationId: student.organizationId
          }
        });
      }
    });
  }

  private async publishEvent(event: any): Promise<void> {
    await prisma.eventOutbox.create({
      data: {
        eventId: uuidv4(),
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        eventType: event.eventType,
        payload: JSON.parse(JSON.stringify(event.payload)),
        correlationId: event.correlationId,
        status: EventStatus.PENDING,
        organizationId: 'org_default'
      }
    });
  }
}
