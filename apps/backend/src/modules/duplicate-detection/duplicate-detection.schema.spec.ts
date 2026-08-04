import { PrismaClient } from '@prisma/client';

describe('Duplicate Detection Schema (Phase 3 Step 1)', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    jest.setTimeout(30000);
    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    try {
      await prisma.invoiceFingerprint.deleteMany({ where: { tenantId: 'test-tenant-123' } });
      await prisma.duplicateDetectionPolicy.deleteMany({ where: { tenantId: 'test-tenant-123' } });
    } catch (e) {
      // ignore
    } finally {
      await prisma.$disconnect();
    }
  });

  it('should successfully create and delete an InvoiceFingerprint', async () => {
    const fingerprint = await prisma.invoiceFingerprint.create({
      data: {
        tenantId: 'test-tenant-123',
        vendorId: 'test-vendor-123',
        algorithmVersion: 'v1',
        normalizationVersion: 'v1',
        providerVersion: 'test-provider-v1',
        normalizedInvoiceNumber: 'INV123',
        normalizedVendorName: 'TESTVENDOR',
        normalizedAmount: '100.00',
        normalizedDate: '2026-08-01',
        documentHash: 'hash-123-abc',
        classification: 'EXACT_DUPLICATE',
        score: 99.5,
        recommendedAction: 'AUTO_BLOCK',
        decisionMetadata: { matchedFields: ['normalizedInvoiceNumber', 'normalizedVendorName'] }
      }
    });

    expect(fingerprint).toBeDefined();
    expect(fingerprint.id).toBeDefined();
    expect(fingerprint.documentHash).toBe('hash-123-abc');
    expect(fingerprint.classification).toBe('EXACT_DUPLICATE');
    expect(fingerprint.score).toBe(99.5);
    expect(fingerprint.recommendedAction).toBe('AUTO_BLOCK');

    await expect(
      prisma.invoiceFingerprint.create({
        data: {
          tenantId: 'test-tenant-123',
          vendorId: 'test-vendor-123',
          algorithmVersion: 'v1',
          normalizationVersion: 'v1',
          providerVersion: 'test-provider-v1',
          documentHash: 'hash-123-abc', // Duplicate hash for same tenant
        }
      })
    ).rejects.toThrow(); // Should throw unique constraint violation

    await prisma.invoiceFingerprint.delete({
      where: { id: fingerprint.id }
    });
  });

  it('should successfully create and delete a DuplicateDetectionPolicy', async () => {
    const policy = await prisma.duplicateDetectionPolicy.create({
      data: {
        tenantId: 'test-tenant-123',
        exactThreshold: 98,
        likelyThreshold: 85,
        possibleThreshold: 70,
        weights: {
          vendorWeight: 0.4,
          invoiceWeight: 0.4,
          amountWeight: 0.2
        }
      }
    });

    expect(policy).toBeDefined();
    expect(policy.id).toBeDefined();
    expect(policy.exactThreshold).toBe(98);

    await prisma.duplicateDetectionPolicy.delete({
      where: { id: policy.id }
    });
  });
});
