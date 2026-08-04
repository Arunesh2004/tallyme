import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../../../infrastructure/database/prisma.service';
import { VmmsVendorBranchRepository } from './vmms-vendor-branch.repository';

describe('VmmsVendorBranchRepository', () => {
  let repository: VmmsVendorBranchRepository;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VmmsVendorBranchRepository,
        {
          provide: PrismaService,
          useValue: {
            vendorBranch: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get<VmmsVendorBranchRepository>(
      VmmsVendorBranchRepository,
    );
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('findById', () => {
    it('should return mapped domain object if branch is found', async () => {
      const mockBranch = {
        id: 'branch-1',
        vendorId: 'vendor-1',
        companyId: 'company-1',
        gstin: '27ABCDE1234F1Z5',
        status: 'ACTIVE',
      };
      jest
        .spyOn(prismaService.vendorBranch, 'findUnique')
        .mockResolvedValue(mockBranch as any);

      const result = await repository.findById('branch-1');
      expect(result).toEqual(mockBranch);
      expect(prismaService.vendorBranch.findUnique).toHaveBeenCalledWith({
        where: { id: 'branch-1' },
        select: {
          id: true,
          vendorId: true,
          companyId: true,
          gstin: true,
          status: true,
        },
      });
    });

    it('should return null if branch is not found', async () => {
      jest
        .spyOn(prismaService.vendorBranch, 'findUnique')
        .mockResolvedValue(null);
      const result = await repository.findById('invalid-id');
      expect(result).toBeNull();
    });

    it('should propagate infrastructure failures', async () => {
      jest
        .spyOn(prismaService.vendorBranch, 'findUnique')
        .mockRejectedValue(new Error('DB Timeout'));
      await expect(repository.findById('branch-1')).rejects.toThrow(
        'DB Timeout',
      );
    });
  });

  describe('findByExactGstin', () => {
    it('should query by companyId and gstin', async () => {
      const mockBranch = {
        id: 'branch-1',
        vendorId: 'vendor-1',
        companyId: 'company-1',
        gstin: '27ABCDE1234F1Z5',
        status: 'ACTIVE',
      };
      jest
        .spyOn(prismaService.vendorBranch, 'findUnique')
        .mockResolvedValue(mockBranch as any);

      const result = await repository.findByExactGstin(
        'company-1',
        '27ABCDE1234F1Z5',
      );
      expect(result).toEqual(mockBranch);
      expect(prismaService.vendorBranch.findUnique).toHaveBeenCalledWith({
        where: {
          companyId_gstin: { companyId: 'company-1', gstin: '27ABCDE1234F1Z5' },
        },
        select: {
          id: true,
          vendorId: true,
          companyId: true,
          gstin: true,
          status: true,
        },
      });
    });
  });
});
