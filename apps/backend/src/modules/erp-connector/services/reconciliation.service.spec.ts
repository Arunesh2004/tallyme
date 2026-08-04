import { Test, TestingModule } from '@nestjs/testing';
import { ReconciliationService } from './reconciliation.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

describe('ReconciliationService', () => {
  let service: ReconciliationService;

  const mockPrisma = {
    accountingReconciliation: {
      create: jest.fn(),
    },
    accountingException: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReconciliationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ReconciliationService>(ReconciliationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('reconcileVoucher', () => {
    it('should match exactly identical payloads', async () => {
      const payload = {
        totalAmount: 100,
        taxAmount: 10,
        lines: [
          { ledgerName: 'Debit Ledger', isDebit: true, amount: 100 },
          { ledgerName: 'Credit Ledger', isDebit: false, amount: 100 },
        ]
      };

      mockPrisma.accountingReconciliation.create.mockResolvedValue({ status: 'MATCHED' });

      const result = await service.reconcileVoucher('v-1', payload, payload);

      expect(mockPrisma.accountingReconciliation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'MATCHED', expectedAmount: 100, actualAmount: 100 })
        })
      );
      expect(mockPrisma.accountingException.create).not.toHaveBeenCalled();
      expect(result.status).toBe('MATCHED');
    });

    it('should mismatch on ledger structure difference', async () => {
      const expected = {
        totalAmount: 100,
        taxAmount: 10,
        lines: [
          { ledgerName: 'Debit Ledger', isDebit: true, amount: 100 },
          { ledgerName: 'Credit Ledger', isDebit: false, amount: 100 },
        ]
      };
      
      const actual = {
        totalAmount: 100,
        taxAmount: 10,
        lines: [
          { ledgerName: 'Different Ledger', isDebit: true, amount: 100 }, // Different structure
          { ledgerName: 'Credit Ledger', isDebit: false, amount: 100 },
        ]
      };

      mockPrisma.accountingReconciliation.create.mockResolvedValue({ status: 'MISMATCHED' });

      await service.reconcileVoucher('v-1', expected, actual);

      expect(mockPrisma.accountingReconciliation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'MISMATCHED' })
        })
      );
      expect(mockPrisma.accountingException.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ exceptionType: 'AMOUNT_MISMATCH' }) // exception uses this type for structure mismatch too
        })
      );
    });

    it('should mismatch on total amount difference', async () => {
      const expected = { totalAmount: 100, lines: [] };
      const actual = { totalAmount: 120, lines: [] };

      mockPrisma.accountingReconciliation.create.mockResolvedValue({ status: 'MISMATCHED' });

      await service.reconcileVoucher('v-1', expected, actual);

      expect(mockPrisma.accountingReconciliation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'MISMATCHED', difference: 20 })
        })
      );
      expect(mockPrisma.accountingException.create).toHaveBeenCalled();
    });

    it('should mismatch on tax difference', async () => {
      const expected = { totalAmount: 100, taxAmount: 10, lines: [] };
      const actual = { totalAmount: 100, taxAmount: 15, lines: [] };

      mockPrisma.accountingReconciliation.create.mockResolvedValue({ status: 'MISMATCHED' });

      await service.reconcileVoucher('v-1', expected, actual);

      expect(mockPrisma.accountingReconciliation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'MISMATCHED' })
        })
      );
      expect(mockPrisma.accountingException.create).toHaveBeenCalled();
    });

    it('should calculate totalAmount from lines if missing', async () => {
      const payload = {
        lines: [
          { ledgerName: 'L1', isDebit: true, amount: 50 },
          { ledgerName: 'L2', isDebit: true, amount: 50 },
          { ledgerName: 'L3', isDebit: false, amount: 100 },
        ]
      };

      mockPrisma.accountingReconciliation.create.mockResolvedValue({ status: 'MATCHED' });

      await service.reconcileVoucher('v-1', payload, payload);

      expect(mockPrisma.accountingReconciliation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ expectedAmount: 100, actualAmount: 100, status: 'MATCHED' })
        })
      );
    });
  });
});
