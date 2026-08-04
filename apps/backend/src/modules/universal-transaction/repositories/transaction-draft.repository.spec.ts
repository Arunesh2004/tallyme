import { Test, TestingModule } from '@nestjs/testing';
import { TransactionDraftRepository } from './transaction-draft.repository';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TransactionStatus } from '@prisma/client';

describe('TransactionDraftRepository', () => {
  let repo: TransactionDraftRepository;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn().mockImplementation(async (cb) => cb(prisma)),
      transactionDraft: {
        create: jest.fn(),
        updateMany: jest.fn(),
        findUnique: jest.fn(),
      },
      transactionAuditLog: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionDraftRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repo = module.get<TransactionDraftRepository>(TransactionDraftRepository);
  });

  const payload: any = { header: { tenantId: 't1' } };

  describe('createDraft', () => {
    it('should create draft and audit log', async () => {
      prisma.transactionDraft.create.mockResolvedValue({ id: 'd1' });
      const result = await repo.createDraft(payload, 'u1');
      expect(result.id).toBe('d1');
      expect(prisma.transactionDraft.create).toHaveBeenCalled();
      expect(prisma.transactionAuditLog.create).toHaveBeenCalled();
    });
  });

  describe('updateDraftWithOptimisticLocking', () => {
    it('should update draft if version matches', async () => {
      prisma.transactionDraft.updateMany.mockResolvedValue({ count: 1 });
      prisma.transactionDraft.findUnique.mockResolvedValue({ id: 'd1', version: 2 });
      
      const result = await repo.updateDraftWithOptimisticLocking('d1', 1, 'u1', payload, TransactionStatus.APPROVED, 'reason');
      expect(result!.id).toBe('d1');
      expect(prisma.transactionDraft.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'd1', version: 1 } })
      );
      expect(prisma.transactionAuditLog.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if draft does not exist', async () => {
      prisma.transactionDraft.updateMany.mockResolvedValue({ count: 0 });
      prisma.transactionDraft.findUnique.mockResolvedValue(null);
      
      await expect(
        repo.updateDraftWithOptimisticLocking('d1', 1, 'u1', payload, TransactionStatus.APPROVED)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if version mismatch', async () => {
      prisma.transactionDraft.updateMany.mockResolvedValue({ count: 0 });
      prisma.transactionDraft.findUnique.mockResolvedValue({ id: 'd1' }); // exists but update failed
      
      await expect(
        repo.updateDraftWithOptimisticLocking('d1', 1, 'u1', payload, TransactionStatus.APPROVED)
      ).rejects.toThrow(ConflictException);
    });

    it('should use provided transaction if passed', async () => {
      prisma.transactionDraft.updateMany.mockResolvedValue({ count: 1 });
      prisma.transactionDraft.findUnique.mockResolvedValue({ id: 'd1' });
      
      const tx = { ...prisma };
      await repo.updateDraftWithOptimisticLocking('d1', 1, 'u1', payload, TransactionStatus.APPROVED, undefined, tx as any);
      expect(tx.transactionDraft.updateMany).toHaveBeenCalled();
    });
  });
});
