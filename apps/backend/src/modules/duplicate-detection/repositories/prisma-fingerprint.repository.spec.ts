import { Test, TestingModule } from '@nestjs/testing';
import { PrismaFingerprintRepository } from './prisma-fingerprint.repository';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

describe('PrismaFingerprintRepository', () => {
  let repository: PrismaFingerprintRepository;
  let mockPrisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    mockPrisma = {
      invoiceFingerprint: {
        findMany: jest.fn(),
        create: jest.fn()
      }
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaFingerprintRepository,
        { provide: PrismaService, useValue: mockPrisma }
      ],
    }).compile();

    repository = module.get<PrismaFingerprintRepository>(PrismaFingerprintRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  it('should fetch candidates with a hard limit of 1000 and descending order', async () => {
    const mockData = [{ id: '1' }, { id: '2' }];
    (mockPrisma.invoiceFingerprint.findMany as jest.Mock).mockResolvedValue(mockData as any);

    const result = await repository.findCandidates('tenant-1', { vendorId: 'vendor-1' });

    expect(mockPrisma.invoiceFingerprint.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        vendorId: 'vendor-1'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 1000
    });

    // Ensure elements are deep frozen
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result[0])).toBe(true);
  });

  it('should omit undefined criteria from where clause', async () => {
    (mockPrisma.invoiceFingerprint.findMany as jest.Mock).mockResolvedValue([]);

    await repository.findCandidates('tenant-1', { normalizedVendorName: 'ACME' });

    expect(mockPrisma.invoiceFingerprint.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant-1',
        normalizedVendorName: 'ACME'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 1000
    });
  });

  it('should create fingerprint and ensure decisionMetadata is properly handled', async () => {
    const fingerprintToCreate = {
      tenantId: 't1',
      vendorId: null,
      documentHash: 'hash',
      algorithmVersion: 'v1',
      normalizationVersion: 'v1',
      normalizedInvoiceNumber: null,
      normalizedVendorName: null,
      normalizedAmount: null,
      normalizedDate: null,
      providerVersion: null
    };

    const returnedFingerprint = { ...fingerprintToCreate, id: 'id1' };
    (mockPrisma.invoiceFingerprint.create as jest.Mock).mockResolvedValue(returnedFingerprint);

    const result = await repository.create(fingerprintToCreate as any);

    expect(mockPrisma.invoiceFingerprint.create).toHaveBeenCalledWith({
      data: {
        ...fingerprintToCreate,
        decisionMetadata: null
      }
    });
    expect(result).toEqual(returnedFingerprint);
  });

  it('should use provided transaction client if tx is passed', async () => {
    const fingerprintToCreate = {
      tenantId: 't1',
      vendorId: null,
      documentHash: 'hash',
      algorithmVersion: 'v1',
      normalizationVersion: 'v1',
      normalizedInvoiceNumber: null,
      normalizedVendorName: null,
      normalizedAmount: null,
      normalizedDate: null,
      providerVersion: null,
      decisionMetadata: { some: 'data' } as any
    };

    const mockTx = {
      invoiceFingerprint: {
        create: jest.fn().mockResolvedValue({ id: 'id1', ...fingerprintToCreate })
      }
    };

    await repository.create(fingerprintToCreate as any, mockTx);

    expect(mockTx.invoiceFingerprint.create).toHaveBeenCalledWith({
      data: {
        ...fingerprintToCreate
      }
    });
    expect(mockPrisma.invoiceFingerprint.create).not.toHaveBeenCalled();
  });
});
