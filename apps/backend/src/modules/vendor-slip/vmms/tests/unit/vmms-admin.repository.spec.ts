import { Test, TestingModule } from '@nestjs/testing';
import { VmmsAdminRepository } from '../../infrastructure/repositories/vmms-admin.repository';
import { PrismaService } from '../../../../../infrastructure/database/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('VmmsAdminRepository', () => {
  let repo: VmmsAdminRepository;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrisma = {
      invoiceCandidate: { findUnique: jest.fn() },
      vendorLedger: { findUnique: jest.fn() },
      $transaction: jest.fn((cb) =>
        cb({
          vendorMatchDecision: { update: jest.fn() },
          vendorAudit: { create: jest.fn() },
          vendorAlias: {
            create: jest
              .fn()
              .mockResolvedValue({ id: 'alias-id', aliasText: 'TEST' }),
          },
        }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VmmsAdminRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repo = module.get<VmmsAdminRepository>(VmmsAdminRepository);
    prisma = module.get(PrismaService);
  });

  it('should resolveMismatch transactionally', async () => {
    (prisma.invoiceCandidate.findUnique as any).mockResolvedValue({
      id: 'inv-1',
      document: { companyId: 'comp-1' },
      matchDecision: {
        id: 'md-1',
        selectedVendorLedger: { vendorBranch: { vendorId: 'vend-1' } },
      },
    });

    await expect(
      repo.resolveMismatch(
        'inv-1',
        'VMMS_CORRECT',
        'notes',
        undefined,
        'user-1',
      ),
    ).resolves.toBeUndefined();
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('should throw NotFoundException if invoice not found for resolveMismatch', async () => {
    (prisma.invoiceCandidate.findUnique as any).mockResolvedValue(null);
    await expect(
      repo.resolveMismatch(
        'inv-1',
        'VMMS_CORRECT',
        undefined,
        undefined,
        'user-1',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('should createAlias transactionally', async () => {
    (prisma.vendorLedger.findUnique as any).mockResolvedValue({
      id: 'leg-1',
      companyId: 'comp-1',
      vendorBranchId: 'branch-1',
      vendorBranch: { vendorId: 'vend-1' },
    });

    const result = await repo.createAlias('leg-1', 'TEST', 'inv-1', 'user-1');
    expect(result.id).toBe('alias-id');
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('should throw NotFoundException if ledger not found for createAlias', async () => {
    (prisma.vendorLedger.findUnique as any).mockResolvedValue(null);
    await expect(
      repo.createAlias('leg-1', 'TEST', undefined, 'user-1'),
    ).rejects.toThrow(NotFoundException);
  });
});
