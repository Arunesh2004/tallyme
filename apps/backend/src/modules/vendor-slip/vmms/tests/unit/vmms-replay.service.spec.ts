import { Test, TestingModule } from '@nestjs/testing';
import { VmmsReplayService } from '../../application/vmms-replay.service';
import { PrismaService } from '../../../../../infrastructure/database/prisma.service';
import { VmmsVendorMatcher } from '../../domain/services/vmms-matcher.service';
import { VmmsEvidenceBuilder } from '../../domain/services/vmms-evidence-builder';

import { NotFoundException } from '@nestjs/common';
import { VmmsMatchResult } from '../../domain/models/vmms-match-result';
import { VmmsMatchStage } from '../../domain/models/vmms-match-stage.enum';

describe('VmmsReplayService', () => {
  let service: VmmsReplayService;
  let prisma: jest.Mocked<PrismaService>;
  let matcher: jest.Mocked<VmmsVendorMatcher>;
  let evidenceBuilder: jest.Mocked<VmmsEvidenceBuilder>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VmmsReplayService,
        {
          provide: PrismaService,
          useValue: {
            invoiceCandidate: {
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: VmmsVendorMatcher,
          useValue: {
            match: jest.fn(),
          },
        },
        {
          provide: VmmsEvidenceBuilder,
          useValue: {
            build: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VmmsReplayService>(VmmsReplayService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    matcher = module.get(VmmsVendorMatcher) as jest.Mocked<VmmsVendorMatcher>;
    evidenceBuilder = module.get(
      VmmsEvidenceBuilder,
    ) as jest.Mocked<VmmsEvidenceBuilder>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('replayInvoice', () => {
    it('should throw NotFoundException if invoice is missing', async () => {
      (prisma.invoiceCandidate.findUnique as any).mockResolvedValue(null);
      await expect(service.replayInvoice('inv-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw Error if invoice has no companyId', async () => {
      (prisma.invoiceCandidate.findUnique as any).mockResolvedValue({
        document: { companyId: null },
      });
      await expect(service.replayInvoice('inv-1')).rejects.toThrow(Error);
    });

    it('should classify as IDENTICAL if ledgers match and manual review flags match', async () => {
      (prisma.invoiceCandidate.findUnique as any).mockResolvedValue({
        extractedGstin: '123',
        document: { companyId: 'comp-1' },
        matchDecision: {
          selectedVendorLedgerId: 'ledger-1',
          matchEvidence: { requiresManualReview: false },
        },
      });

      matcher.match.mockResolvedValue(
        new VmmsMatchResult(
          'branch-1',
          'ledger-1',
          VmmsMatchStage.EXACT_GSTIN,
          100,
          false,
          [],
        ),
      );

      evidenceBuilder.build.mockReturnValue({ algorithmVersion: 'v1' } as any);

      const result = await service.replayInvoice('inv-1');
      expect(result.diffStatus).toBe('IDENTICAL');
    });

    it('should classify as IMPROVED if historical had no ledger and simulation found one', async () => {
      (prisma.invoiceCandidate.findUnique as any).mockResolvedValue({
        extractedGstin: '123',
        document: { companyId: 'comp-1' },
        matchDecision: null,
      });

      matcher.match.mockResolvedValue(
        new VmmsMatchResult(
          'branch-1',
          'ledger-1',
          VmmsMatchStage.EXACT_GSTIN,
          100,
          false,
          [],
        ),
      );
      evidenceBuilder.build.mockReturnValue({ algorithmVersion: 'v1' } as any);

      const result = await service.replayInvoice('inv-1');
      expect(result.diffStatus).toBe('IMPROVED');
    });

    it('should classify as DEGRADED if historical had ledger and simulation did not', async () => {
      (prisma.invoiceCandidate.findUnique as any).mockResolvedValue({
        extractedGstin: '123',
        document: { companyId: 'comp-1' },
        matchDecision: { selectedVendorLedgerId: 'ledger-1' },
      });

      matcher.match.mockResolvedValue(
        new VmmsMatchResult(null, null, VmmsMatchStage.NONE, 0, true, []),
      );
      evidenceBuilder.build.mockReturnValue({ algorithmVersion: 'v1' } as any);

      const result = await service.replayInvoice('inv-1');
      expect(result.diffStatus).toBe('DEGRADED');
    });

    it('should propagate matcher exception', async () => {
      (prisma.invoiceCandidate.findUnique as any).mockResolvedValue({
        extractedGstin: '123',
        document: { companyId: 'comp-1' },
      });

      matcher.match.mockRejectedValue(new Error('Matcher Exploded'));

      await expect(service.replayInvoice('inv-1')).rejects.toThrow(
        'Matcher Exploded',
      );
    });

    it('should propagate repository failure', async () => {
      (prisma.invoiceCandidate.findUnique as any).mockRejectedValue(
        new Error('DB Timeout'),
      );
      await expect(service.replayInvoice('inv-1')).rejects.toThrow(
        'DB Timeout',
      );
    });
  });
});
