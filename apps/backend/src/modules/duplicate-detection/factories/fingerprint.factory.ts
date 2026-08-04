import { Injectable } from '@nestjs/common';
import { DuplicateDetectionRequest } from '../dto/duplicate-detection-request.dto';
import { InvoiceFingerprint } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class FingerprintFactory {
  public static readonly ALGORITHM_VERSION = '1.0';
  public static readonly NORMALIZATION_VERSION = '1.0';

  public generate(request: DuplicateDetectionRequest): Omit<InvoiceFingerprint, 'id' | 'createdAt' | 'updatedAt' | 'classification' | 'score' | 'recommendedAction' | 'decisionMetadata' | 'providerVersion'> {
    const normalizedInvoiceNumber = this.normalizeAlphanumeric(request.invoiceNumber);
    const normalizedVendorName = this.normalizeAlphanumeric(request.vendorId || ''); // In real scenario, would map vendorId to name or assume request provides raw name. We'll normalize what we have.
    const normalizedAmount = this.normalizeAmount(request.amount);
    const normalizedDate = request.invoiceDate ? request.invoiceDate.split('T')[0] : undefined;
    
    // Construct document hash using strict determinism
    const hashPayload = [
      request.tenantId,
      request.vendorId || '',
      normalizedInvoiceNumber || '',
      normalizedAmount || '',
      normalizedDate || ''
    ].join('|');

    const documentHash = request.documentHash || crypto.createHash('sha256').update(hashPayload).digest('hex');

    return {
      tenantId: request.tenantId,
      vendorId: request.vendorId || null,
      algorithmVersion: FingerprintFactory.ALGORITHM_VERSION,
      normalizationVersion: FingerprintFactory.NORMALIZATION_VERSION,
      normalizedInvoiceNumber: normalizedInvoiceNumber || null,
      normalizedVendorName: normalizedVendorName || null,
      normalizedAmount: normalizedAmount || null,
      normalizedDate: normalizedDate || null,
      documentHash: documentHash
    };
  }

  private normalizeAlphanumeric(value?: string): string | undefined {
    if (!value) return undefined;
    // Remove all non-alphanumeric chars and uppercase
    return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  }

  private normalizeAmount(value?: string): string | undefined {
    if (!value) return undefined;
    const parsed = parseFloat(value);
    if (isNaN(parsed)) return undefined;
    return parsed.toFixed(2);
  }
}
