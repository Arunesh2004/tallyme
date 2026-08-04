import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../../../infrastructure/database/prisma.service';
import { VmmsVendorMatchDecisionRepository } from './vmms-vendor-match-decision.repository';
import { Prisma } from '@prisma/client';

describe('VmmsVendorMatchDecisionRepository', () => {
  let repository: VmmsVendorMatchDecisionRepository;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VmmsVendorMatchDecisionRepository,
        {
          provide: PrismaService,
          useValue: {
            vendorMatchDecision: {
              count: jest.fn(),
              create: jest.fn(),
              upsert: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get<VmmsVendorMatchDecisionRepository>(
      VmmsVendorMatchDecisionRepository,
    );
    prismaService = module.get<PrismaService>(PrismaService);
  });

  const mockPayload = {
    invoiceCandidateId: 'cand-1',
    selectedVendorLedgerId: 'ledger-1',
    isAutomated: true,
    matchEvidence: { schemaVersion: 'v1.0' },
  };

  describe('exists', () => {
    it('should return true if count > 0', async () => {
      jest
        .spyOn(prismaService.vendorMatchDecision, 'count')
        .mockResolvedValue(1);
      const result = await repository.exists('cand-1');
      expect(result).toBe(true);
      expect(prismaService.vendorMatchDecision.count).toHaveBeenCalledWith({
        where: { invoiceCandidateId: 'cand-1' },
      });
    });

    it('should return false if count is 0', async () => {
      jest
        .spyOn(prismaService.vendorMatchDecision, 'count')
        .mockResolvedValue(0);
      const result = await repository.exists('cand-1');
      expect(result).toBe(false);
    });
  });

  describe('create', () => {
    it('should successfully create decision', async () => {
      jest
        .spyOn(prismaService.vendorMatchDecision, 'create')
        .mockResolvedValue({} as any);
      await expect(repository.create(mockPayload)).resolves.not.toThrow();
      expect(prismaService.vendorMatchDecision.create).toHaveBeenCalled();
    });

    it('should swallow P2002 duplicate write exception (Idempotency)', async () => {
      const p2002Error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: 'x',
        },
      );
      jest
        .spyOn(prismaService.vendorMatchDecision, 'create')
        .mockRejectedValue(p2002Error);

      // Should resolve safely, swallowing the duplicate constraint violation
      await expect(repository.create(mockPayload)).resolves.not.toThrow();
    });

    it('should propagate non-P2002 infrastructure failures', async () => {
      const p2003Error = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        {
          code: 'P2003',
          clientVersion: 'x',
        },
      );
      jest
        .spyOn(prismaService.vendorMatchDecision, 'create')
        .mockRejectedValue(p2003Error);

      await expect(repository.create(mockPayload)).rejects.toThrow(
        'Foreign key constraint failed',
      );
    });
  });

  describe('upsert', () => {
    it('should execute upsert correctly', async () => {
      jest
        .spyOn(prismaService.vendorMatchDecision, 'upsert')
        .mockResolvedValue({} as any);
      await expect(repository.upsert(mockPayload)).resolves.not.toThrow();
      expect(prismaService.vendorMatchDecision.upsert).toHaveBeenCalled();
    });
  });
});
