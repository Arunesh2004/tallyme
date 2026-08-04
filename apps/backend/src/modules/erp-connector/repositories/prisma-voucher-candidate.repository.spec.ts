import { Test, TestingModule } from '@nestjs/testing';
import { PrismaVoucherCandidateRepository } from './prisma-voucher-candidate.repository';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

describe('PrismaVoucherCandidateRepository', () => {
  let repo: PrismaVoucherCandidateRepository;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      voucherCandidate: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaVoucherCandidateRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repo = module.get<PrismaVoucherCandidateRepository>(PrismaVoucherCandidateRepository);
  });

  describe('findById', () => {
    it('should return null if candidate not found', async () => {
      prisma.voucherCandidate.findUnique.mockResolvedValue(null);
      const result = await repo.findById('v-1');
      expect(result).toBeNull();
    });

    it('should map candidate to TallyVoucherDTO', async () => {
      const mockCandidate = {
        id: 'v-1',
        companyId: 'comp-1',
        company: { name: 'Acme Corp' },
        voucherNumber: 'VCH-001',
        voucherType: 'Purchase',
        date: new Date('2024-01-01'),
        partyLedgerName: 'Vendor A',
        isEdit: false,
        metadata: {
          gstin: '36AAAAA1234A1Z5',
          pan: 'AAAAA1234A',
          invoiceNumber: 'INV-001',
          taxes: { cgst: 9, sgst: 9 },
          lineItems: [
            { description: 'Office Expenses', amount: 100, hsnSac: '8471', quantity: 10, unit: 'Nos', rate: 10 },
          ],
        },
        entries: [
          { ledgerName: 'Vendor A', isDebit: false, isParty: true, amount: { toNumber: () => 100 }, sequence: 1 },
          { ledgerName: 'Office Expenses', isDebit: true, isParty: false, amount: { toNumber: () => 100 }, sequence: 2 },
        ],
      };
      prisma.voucherCandidate.findUnique.mockResolvedValue(mockCandidate);

      const result = await repo.findById('v-1');
      expect(result).not.toBeNull();
      expect(result!.voucherNumber).toBe('VCH-001');
      expect(result!.companyName).toBe('Acme Corp');
      expect(result!.supplierGstin).toBe('36AAAAA1234A1Z5');
      expect(result!.date).toBe('20240101');
      expect(result!.lines).toHaveLength(2);
      expect(result!.cgst).toBe(9);
    });

    it('should handle missing company gracefully', async () => {
      const mockCandidate = {
        id: 'v-1',
        companyId: null,
        company: null,
        voucherNumber: 'VCH-001',
        voucherType: 'Purchase',
        date: new Date('2024-01-01'),
        partyLedgerName: null,
        isEdit: false,
        metadata: {},
        entries: [],
      };
      prisma.voucherCandidate.findUnique.mockResolvedValue(mockCandidate);

      const result = await repo.findById('v-1');
      expect(result!.companyName).toBe('Unknown Company');
      expect(result!.partyLedgerName).toBe('');
    });
  });
});
