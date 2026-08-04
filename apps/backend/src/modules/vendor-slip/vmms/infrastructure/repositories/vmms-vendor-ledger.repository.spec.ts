import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../../../infrastructure/database/prisma.service';
import { VmmsVendorLedgerRepository } from './vmms-vendor-ledger.repository';

describe('VmmsVendorLedgerRepository', () => {
  let repository: VmmsVendorLedgerRepository;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VmmsVendorLedgerRepository,
        {
          provide: PrismaService,
          useValue: {
            vendorLedger: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get<VmmsVendorLedgerRepository>(
      VmmsVendorLedgerRepository,
    );
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('findByBranchId', () => {
    it('should return mapped array of ledgers', async () => {
      const mockLedgers = [
        {
          id: 'ledger-1',
          vendorBranchId: 'branch-1',
          companyId: 'comp-1',
          erpLedgerCode: 'L1',
          status: 'ACTIVE',
          defaultExpenseCategory: null,
        },
      ];
      jest
        .spyOn(prismaService.vendorLedger, 'findMany')
        .mockResolvedValue(mockLedgers as any);

      const result = await repository.findByBranchId('branch-1');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockLedgers[0]);
      expect(prismaService.vendorLedger.findMany).toHaveBeenCalledWith({
        where: { vendorBranchId: 'branch-1' },
        select: {
          id: true,
          vendorBranchId: true,
          companyId: true,
          erpLedgerCode: true,
          status: true,
          defaultExpenseCategory: true,
        },
      });
    });

    it('should propagate infrastructure failures', async () => {
      jest
        .spyOn(prismaService.vendorLedger, 'findMany')
        .mockRejectedValue(new Error('DB Timeout'));
      await expect(repository.findByBranchId('branch-1')).rejects.toThrow(
        'DB Timeout',
      );
    });
  });
});
