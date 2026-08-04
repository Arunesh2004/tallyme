import { Test, TestingModule } from '@nestjs/testing';
import { PrismaVoucherCandidateRepository } from './index';
import { PrismaService } from '../../../../infrastructure/prisma';
import { InfrastructureException } from '../../../../shared/exceptions/InfrastructureException';

describe('PrismaVoucherCandidateRepository', () => {
  let repo: PrismaVoucherCandidateRepository;
  
  const mockPrisma = {
    voucherCandidate: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    }
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    mockPrisma.voucherCandidate.upsert.mockResolvedValue({});
    mockPrisma.voucherCandidate.findMany.mockResolvedValue([]);
    mockPrisma.voucherCandidate.update.mockResolvedValue({});
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaVoucherCandidateRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repo = module.get<PrismaVoucherCandidateRepository>(PrismaVoucherCandidateRepository);
  });

  describe('saveBalancedVoucher', () => {
    it('should upsert voucher', async () => {
      mockPrisma.voucherCandidate.upsert.mockResolvedValue({});
      await repo.saveBalancedVoucher({ id: '1', companyId: 'c1', voucherNumber: 'V1', date: new Date(), status: 'PENDING', lines: [] } as any, null as any);
      expect(mockPrisma.voucherCandidate.upsert).toHaveBeenCalled();
    });

    it('should throw InfrastructureException on P2002', async () => {
      mockPrisma.voucherCandidate.upsert.mockRejectedValue({ code: 'P2002' });
      await expect(repo.saveBalancedVoucher({ id: '1', companyId: 'c1', voucherNumber: 'V1', date: new Date(), status: 'PENDING', lines: [] } as any, null as any)).rejects.toThrow(InfrastructureException);
    });

    it('should throw InfrastructureException on other error', async () => {
      mockPrisma.voucherCandidate.upsert.mockRejectedValue(new Error('Other'));
      await expect(repo.saveBalancedVoucher({ id: '1', companyId: 'c1', voucherNumber: 'V1', date: new Date(), status: 'PENDING', lines: [] } as any, null as any)).rejects.toThrow(InfrastructureException);
    });
  });

  describe('findPendingERPSync', () => {
    it('should return mapped candidates', async () => {
      mockPrisma.voucherCandidate.findMany.mockResolvedValue([{ id: '1', date: new Date(), status: 'PENDING', entries: [] }]);
      const res = await repo.findPendingERPSync();
      expect(res.length).toBe(1);
    });

    it('should throw on error', async () => {
      mockPrisma.voucherCandidate.findMany.mockRejectedValue(new Error());
      await expect(repo.findPendingERPSync()).rejects.toThrow(InfrastructureException);
    });
  });

  describe('markVoucherAsSynced', () => {
    it('should update status', async () => {
      await repo.markVoucherAsSynced('1', 'ref1', null as any);
      expect(mockPrisma.voucherCandidate.update).toHaveBeenCalledWith({ where: { id: '1' }, data: { status: 'COMPLETED' } });
    });

    it('should throw on error', async () => {
      mockPrisma.voucherCandidate.update.mockRejectedValue(new Error());
      await expect(repo.markVoucherAsSynced('1', 'ref1', null as any)).rejects.toThrow(InfrastructureException);
    });
  });

  describe('markVoucherAsFailed', () => {
    it('should update status', async () => {
      await repo.markVoucherAsFailed('1', 'reason', null as any);
      expect(mockPrisma.voucherCandidate.update).toHaveBeenCalledWith({ where: { id: '1' }, data: { status: 'FAILED' } });
    });

    it('should throw on error', async () => {
      mockPrisma.voucherCandidate.update.mockRejectedValue(new Error());
      await expect(repo.markVoucherAsFailed('1', 'reason', null as any)).rejects.toThrow(InfrastructureException);
    });
  });
});
