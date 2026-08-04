import { PrismaClient } from '@prisma/client';
import { PrismaFingerprintRepository } from './prisma-fingerprint.repository';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

describe('PrismaFingerprintRepository (Integration - Tenant Isolation)', () => {
  let prisma: PrismaClient;
  let repository: PrismaFingerprintRepository;
  const tenantA = 'tenant-A-iso';
  const tenantB = 'tenant-B-iso';

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
    
    // We pass the raw PrismaClient disguised as PrismaService for the repository to use
    repository = new PrismaFingerprintRepository(prisma as unknown as PrismaService);
  });

  afterAll(async () => {
    // Cleanup
    await prisma.invoiceFingerprint.deleteMany({
      where: {
        tenantId: { in: [tenantA, tenantB] }
      }
    });
    await prisma.$disconnect();
  });

  it('should never return Tenant B fingerprints when searching for Tenant A candidates', async () => {
    // Insert Tenant A data
    await prisma.invoiceFingerprint.create({
      data: {
        tenantId: tenantA,
        vendorId: 'vendor-shared',
        algorithmVersion: 'v1',
        normalizationVersion: 'v1',
        documentHash: 'SHARED-HASH-123',
      }
    });

    // Insert Tenant B data with EXACT same hash and vendorId
    await prisma.invoiceFingerprint.create({
      data: {
        tenantId: tenantB,
        vendorId: 'vendor-shared',
        algorithmVersion: 'v1',
        normalizationVersion: 'v1',
        documentHash: 'SHARED-HASH-123',
      }
    });

    // Search for candidates in Tenant A
    const candidatesForA = await repository.findCandidates(tenantA, { vendorId: 'vendor-shared' });
    
    expect(candidatesForA.length).toBe(1);
    expect(candidatesForA[0].tenantId).toBe(tenantA);
    expect(candidatesForA[0].documentHash).toBe('SHARED-HASH-123');

    // Search for candidates in Tenant B
    const candidatesForB = await repository.findCandidates(tenantB, { vendorId: 'vendor-shared' });
    
    expect(candidatesForB.length).toBe(1);
    expect(candidatesForB[0].tenantId).toBe(tenantB);
    expect(candidatesForB[0].documentHash).toBe('SHARED-HASH-123');
  });
});
