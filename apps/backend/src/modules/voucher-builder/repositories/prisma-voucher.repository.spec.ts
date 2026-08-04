import { Test, TestingModule } from '@nestjs/testing';
import { PrismaVoucherRepository } from './prisma-voucher.repository';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

describe('PrismaVoucherRepository', () => {
  let repo: PrismaVoucherRepository;

  const mockTx = {
    batchSyncItem: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    voucherCandidate: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    voucherValidation: {
      create: jest.fn().mockResolvedValue({ id: 'val-1' }),
    },
    voucherValidationLog: {
      create: jest.fn(),
    }
  };

  const mockPrisma = {
    voucherCandidate: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockTx)),
    voucherLedger: {
      findUnique: jest.fn(),
    },
    feeAllocationCandidate: {
      findUnique: jest.fn(),
    },
    company: {
      count: jest.fn(),
    },
    voucherValidationLog: {
      create: jest.fn(),
    },
    voucherGenerationAttempt: {
      create: jest.fn(),
    }
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaVoucherRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repo = module.get<PrismaVoucherRepository>(PrismaVoucherRepository);
  });

  it('should save voucher candidate directly', async () => {
    mockPrisma.voucherCandidate.create.mockResolvedValue({ id: '1' });
    await repo.saveVoucherCandidate({ lines: [], references: [], narrations: [] });
    expect(mockPrisma.voucherCandidate.create).toHaveBeenCalled();
  });

  describe('saveVoucherResult', () => {
    it('should hit idempotency by batchSyncItemId', async () => {
      mockTx.batchSyncItem.findUnique.mockResolvedValue({ id: 'b1', voucherCandidateId: 'vc-1' });
      mockTx.voucherCandidate.findUnique.mockResolvedValue({ id: 'vc-1' });
      
      const res = await repo.saveVoucherResult({ batchSyncItemId: 'b1' }, null);
      expect(res.id).toBe('vc-1');
    });

    it('should hit idempotency by invoiceCandidateId', async () => {
      mockTx.voucherCandidate.findFirst.mockResolvedValue({ id: 'vc-2' });
      const res = await repo.saveVoucherResult({ metadata: { invoiceCandidateId: 'inv-1' } }, null);
      expect(res.id).toBe('vc-2');
    });

    it('should create new voucher and log validation', async () => {
      mockTx.batchSyncItem.findUnique.mockResolvedValue(null);
      mockTx.voucherCandidate.findFirst.mockResolvedValue(null);
      mockTx.voucherCandidate.create.mockResolvedValue({ id: 'vc-3' });

      const res = await repo.saveVoucherResult({
        companyId: 'c1', voucherNumber: 'V1', voucherType: 'PURCHASE', date: new Date(),
        lines: [{ isParty: true, ledgerName: 'Party' }]
      }, { level: 'INFO', message: 'test', details: { executionTimeMs: 10 } });

      expect(res.id).toBe('vc-3');
      expect(mockTx.voucherValidation.create).toHaveBeenCalled();
      expect(mockTx.voucherValidationLog.create).toHaveBeenCalled();
    });

    it('should update batch sync item if present', async () => {
      mockTx.batchSyncItem.findUnique.mockResolvedValue(null);
      mockTx.voucherCandidate.findFirst.mockResolvedValue(null);
      mockTx.voucherCandidate.create.mockResolvedValue({ id: 'vc-4' });

      await repo.saveVoucherResult({ batchSyncItemId: 'b2' }, null);
      expect(mockTx.batchSyncItem.update).toHaveBeenCalledWith({
        where: { id: 'b2' },
        data: { voucherCandidateId: 'vc-4', status: 'VOUCHER_CREATED' }
      });
    });
  });

  it('should find ledger by name', async () => {
    await repo.findLedgerByName('L1');
    expect(mockPrisma.voucherLedger.findUnique).toHaveBeenCalledWith({ where: { name: 'L1' } });
  });

  it('should find fee allocation candidate', async () => {
    await repo.findFeeAllocationCandidateById('F1');
    expect(mockPrisma.feeAllocationCandidate.findUnique).toHaveBeenCalledWith({ where: { id: 'F1' }, include: { studentPaymentCandidate: true } });
  });

  it('should check company exists', async () => {
    mockPrisma.company.count.mockResolvedValue(1);
    const exists = await repo.checkCompanyExists('C1');
    expect(exists).toBe(true);
  });

  it('should log validation', async () => {
    await repo.logValidation({ status: 'OK' });
    expect(mockPrisma.voucherValidationLog.create).toHaveBeenCalled();
  });

  it('should log attempt', async () => {
    await repo.logAttempt({ attempt: 1 });
    expect(mockPrisma.voucherGenerationAttempt.create).toHaveBeenCalled();
  });

  it('should delete old obsolete candidates', async () => {
    mockPrisma.voucherCandidate.deleteMany.mockResolvedValue({ count: 10 });
    const count = await repo.deleteOldObsoleteCandidates(90);
    expect(count).toBe(10);
    expect(mockPrisma.voucherCandidate.deleteMany).toHaveBeenCalled();
  });
});
