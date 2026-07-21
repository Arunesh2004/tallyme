import { Injectable } from '@nestjs/common';
import { PrismaVendorAutomationRepository } from '../infrastructure/repositories/prisma-vendor-automation.repository';

@Injectable()
export class FakeVendorAutomationRepository extends PrismaVendorAutomationRepository {
  private docs = new Map<string, any>();
  private invoiceCandidates = new Map<string, any>();
  private vendorMatches = new Map<string, any>();
  private allocations = new Map<string, any>();
  private reviews = new Map<string, any>();
  public audits: any[] = [];
  private vendors = [
    {
      id: 'v1',
      gstin: '29ABCDE1234F1Z5',
      pan: 'ABCDE1234F',
      name: 'Acme Corp',
    },
  ];

  constructor() {
    super({} as any);
  }

  async createDocument(data: any) {
    const doc = {
      id: 'doc-' + Date.now(),
      ...data,
      status: data.status || 'UPLOADED',
    };
    this.docs.set(doc.id, doc);
    return doc;
  }

  async getDocument(id: string) {
    return this.docs.get(id) || null;
  }

  async updateDocumentStatus(
    id: string,
    status: any,
    confidenceScore?: number,
  ) {
    const doc = this.docs.get(id);
    if (doc) {
      doc.status = status;
      if (confidenceScore) doc.confidenceScore = confidenceScore;
    }
    return doc;
  }

  async createInvoiceCandidate(data: any) {
    const cand = { id: 'ic-' + Date.now(), ...data };
    this.invoiceCandidates.set(data.documentId, cand);
    return cand;
  }

  async createVendorMatch(data: any) {
    const match = { id: 'vm-' + Date.now(), ...data };
    this.vendorMatches.set(data.documentId, match);
    return match;
  }

  async createExpenseAllocation(data: any) {
    const alloc = {
      id: 'ea-' + Date.now(),
      ...data,
      totalAllocated: { toNumber: () => data.totalAllocated },
    };
    this.allocations.set(data.documentId, alloc);
    return alloc;
  }

  async routeToManualReview(documentId: string, reason: string): Promise<any> {
    this.updateDocumentStatus(documentId, 'MANUAL_REVIEW');
    const review = {
      id: 'mr-' + Date.now(),
      documentId,
      reason,
      status: 'PENDING',
    };
    this.reviews.set(documentId, review);
    return review as any;
  }

  async logAudit(
    documentId: string,
    action: string,
    metadata?: any,
  ): Promise<any> {
    const audit = { id: 'au-' + Date.now(), documentId, action, metadata };
    this.audits.push(audit);
    return audit as any;
  }

  async findVendorByGstinOrPan(gstin: string, pan: string) {
    return this.vendors.find((v) => v.gstin === gstin || v.pan === pan) || null;
  }

  // Helpers for testing
  getReview(docId: string) {
    return this.reviews.get(docId);
  }
}
