import { FingerprintFactory } from './fingerprint.factory';
import { DuplicateDetectionRequest } from '../dto/duplicate-detection-request.dto';

describe('FingerprintFactory', () => {
  let factory: FingerprintFactory;

  beforeEach(() => {
    factory = new FingerprintFactory();
  });

  it('should generate a fingerprint with normalized values', () => {
    const request: DuplicateDetectionRequest = {
      tenantId: 'tenant-1',
      vendorId: 'vendor-1',
      invoiceNumber: 'INV-2023/001',
      amount: '1234.567',
      invoiceDate: '2023-10-15T10:00:00Z',
    };

    const fingerprint = factory.generate(request);

    expect(fingerprint.tenantId).toBe('tenant-1');
    expect(fingerprint.vendorId).toBe('vendor-1');
    expect(fingerprint.normalizedInvoiceNumber).toBe('INV2023001');
    expect(fingerprint.normalizedAmount).toBe('1234.57');
    expect(fingerprint.normalizedDate).toBe('2023-10-15');
    expect(fingerprint.documentHash).toBeDefined();
    expect(fingerprint.algorithmVersion).toBe(FingerprintFactory.ALGORITHM_VERSION);
  });

  it('should use provided document hash if available', () => {
    const request: DuplicateDetectionRequest = {
      tenantId: 'tenant-1',
      documentHash: 'custom-hash-123',
    };

    const fingerprint = factory.generate(request);

    expect(fingerprint.documentHash).toBe('custom-hash-123');
  });
});
