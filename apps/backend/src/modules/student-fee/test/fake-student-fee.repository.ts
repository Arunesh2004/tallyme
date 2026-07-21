import { Injectable } from '@nestjs/common';
import { PrismaStudentFeeRepository } from '../infrastructure/repositories/prisma-student-fee.repository';

@Injectable()
export class FakeStudentFeeRepository extends PrismaStudentFeeRepository {
  private docs = new Map<string, any>();
  private paymentCandidates = new Map<string, any>();
  private studentMatches = new Map<string, any>();
  private allocations = new Map<string, any>();
  private reviews = new Map<string, any>();
  public audits: any[] = [];
  private students = [
    { id: 'student-123', enrollmentNo: 'EN123', email: 'john@example.com' },
  ];

  private idCounter = 0;

  constructor() {
    super({} as any);
  }

  async createEmailDocument(data: any) {
    this.idCounter++;
    const doc = {
      id: 'edoc-' + Date.now() + '-' + this.idCounter,
      ...data,
      status: data.status || 'RECEIVED',
    };
    this.docs.set(doc.id, doc);
    this.docs.set(doc.messageId, doc); // alias for by messageId
    return doc;
  }

  async getEmailDocument(id: string) {
    return this.docs.get(id) || null;
  }

  async getEmailDocumentByMessageId(messageId: string) {
    // Basic alias search
    for (const doc of this.docs.values()) {
      if (doc.messageId === messageId) return doc;
    }
    return null;
  }

  async updateEmailDocumentStatus(
    id: string,
    status: any,
    lastProcessedStep?: string,
    confidenceScore?: number,
  ) {
    const doc = this.docs.get(id);
    if (doc) {
      doc.status = status;
      if (lastProcessedStep) doc.lastProcessedStep = lastProcessedStep;
      if (confidenceScore) doc.confidenceScore = confidenceScore;
    }
    return doc;
  }

  async createPaymentCandidate(data: any) {
    this.idCounter++;
    const cand = { id: 'pc-' + Date.now() + '-' + this.idCounter, ...data };
    this.paymentCandidates.set(data.documentId, cand);
    return cand;
  }

  async findPaymentCandidatesByTxnOrUtr(
    gatewayTxnId: string | null,
    utr: string | null,
  ) {
    if (!gatewayTxnId && !utr) return [];

    const matches = [];
    for (const cand of this.paymentCandidates.values()) {
      if (
        (gatewayTxnId && cand.gatewayTransactionId === gatewayTxnId) ||
        (utr && cand.utr === utr)
      ) {
        matches.push(cand);
      }
    }
    return matches;
  }

  async createStudentMatch(data: any) {
    const match = { id: 'sm-' + Date.now(), ...data };
    this.studentMatches.set(data.documentId, match);
    return match;
  }

  async createFeeAllocation(data: any) {
    const alloc = {
      id: 'sfa-' + Date.now(),
      ...data,
    };
    this.allocations.set(data.documentId, alloc);
    return alloc;
  }

  async routeToManualReview(documentId: string, reason: string): Promise<any> {
    this.updateEmailDocumentStatus(documentId, 'MANUAL_REVIEW');
    const review = {
      id: 'mr-' + Date.now(),
      documentId,
      reason,
      status: 'PENDING',
    };
    this.reviews.set(documentId, review);
    return review;
  }

  async logAudit(
    documentId: string,
    action: string,
    metadata?: any,
  ): Promise<any> {
    const audit = { id: 'au-' + Date.now(), documentId, action, metadata };
    this.audits.push(audit);
    return audit;
  }

  async findStudentById(id: string) {
    return this.students.find((s) => s.id === id) || null;
  }

  // Helpers for testing
  getReview(docId: string) {
    return this.reviews.get(docId);
  }
}
