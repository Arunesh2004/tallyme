import { Test, TestingModule } from '@nestjs/testing';
import { TallyValidationService } from './tally-validation.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

describe('TallyValidationService', () => {
  let service: TallyValidationService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      tallyValidationRun: {
        create: jest.fn().mockResolvedValue({ id: 'run-1' }),
        update: jest.fn(),
      },
      tallyValidationCheck: {
        createMany: jest.fn(),
        create: jest.fn(),
      },
      accountingException: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TallyValidationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TallyValidationService>(TallyValidationService);
  });

  describe('validatePayload (pure logic)', () => {
    it('should pass valid balanced payload', () => {
      const payload = {
        voucherNumber: 'V-123',
        partyLedgerName: 'Vendor A',
        lines: [
          { ledgerName: 'Expense', amount: 100, isDebit: true },
          { ledgerName: 'Vendor A', amount: 100, isDebit: false },
        ],
      };
      const result = service.validatePayload(payload);
      expect(result.allowed).toBe(true);
      expect(result.failures.length).toBe(0);
    });

    it('should fail if missing voucher number', () => {
      const payload = { voucherNumber: '', lines: [{ ledgerName: 'A', amount: 100 }] };
      const result = service.validatePayload(payload);
      expect(result.allowed).toBe(false);
      expect(result.failures).toContainEqual(expect.objectContaining({ checkType: 'VOUCHER_NUMBER_EXISTS' }));
    });

    it('should fail if no lines', () => {
      const payload = { voucherNumber: 'V-1' };
      const result = service.validatePayload(payload);
      expect(result.allowed).toBe(false);
      expect(result.failures).toContainEqual(expect.objectContaining({ checkType: 'LEDGER_EXISTS' }));
    });

    it('should fail data integrity if amount is NaN', () => {
      const payload = {
        voucherNumber: 'V-1',
        lines: [{ ledgerName: 'A', amount: 'abc', isDebit: true }],
      };
      const result = service.validatePayload(payload);
      expect(result.allowed).toBe(false);
      expect(result.failures).toContainEqual(expect.objectContaining({ checkType: 'DATA_INTEGRITY' }));
    });

    it('should fail data integrity if missing ledger name', () => {
      const payload = {
        voucherNumber: 'V-1',
        lines: [{ amount: 100, isDebit: true }],
      };
      const result = service.validatePayload(payload);
      expect(result.allowed).toBe(false);
      expect(result.failures).toContainEqual(expect.objectContaining({ checkType: 'DATA_INTEGRITY' }));
    });

    it('should fail if missing party ledger', () => {
      const payload = {
        voucherNumber: 'V-1',
        lines: [{ ledgerName: 'A', amount: 100, isDebit: true }, { ledgerName: 'B', amount: 100, isDebit: false }],
      };
      const result = service.validatePayload(payload);
      expect(result.allowed).toBe(false);
      expect(result.failures).toContainEqual(expect.objectContaining({ checkType: 'PARTY_LEDGER_EXISTS' }));
    });

    it('should fail if unbalanced', () => {
      const payload = {
        voucherNumber: 'V-1',
        partyLedgerName: 'Vendor A',
        lines: [
          { ledgerName: 'Expense', amount: 100, isDebit: true },
          { ledgerName: 'Vendor A', amount: 90, isDebit: false },
        ],
      };
      const result = service.validatePayload(payload);
      expect(result.allowed).toBe(false);
      expect(result.failures).toContainEqual(expect.objectContaining({ checkType: 'STRUCTURE_MATCH' }));
    });
  });

  describe('preFlightCheck', () => {
    it('should log checks and return allowed', async () => {
      const payload = {
        voucherNumber: 'V-123',
        partyLedgerName: 'Vendor A',
        lines: [
          { ledgerName: 'Expense', amount: 100, isDebit: true },
          { ledgerName: 'Vendor A', amount: 100, isDebit: false },
        ],
      };

      const result = await service.preFlightCheck('v-1', 'c-1', payload);
      expect(result).toBe(true);
      expect(prisma.tallyValidationRun.create).toHaveBeenCalled();
      expect(prisma.tallyValidationCheck.createMany).toHaveBeenCalled();
      expect(prisma.tallyValidationRun.update).toHaveBeenCalledWith({
        where: { id: 'run-1' },
        data: expect.objectContaining({ status: 'COMPLETED' }),
      });
      expect(prisma.accountingException.create).not.toHaveBeenCalled();
    });

    it('should log failures and create exception if not allowed', async () => {
      const payload = { voucherNumber: '' }; // Will fail immediately due to no lines

      const result = await service.preFlightCheck('v-1', 'c-1', payload);
      expect(result).toBe(false);
      expect(prisma.tallyValidationRun.update).toHaveBeenCalledWith({
        where: { id: 'run-1' },
        data: expect.objectContaining({ status: 'FAILED' }),
      });
      expect(prisma.accountingException.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ exceptionType: 'PRE_FLIGHT_FAILED' }),
      });
    });
  });

  describe('postSyncVerify', () => {
    it('should return true for success object', async () => {
      const result = await service.postSyncVerify('v-1', 'c-1', { success: true });
      expect(result).toBe(true);
      expect(prisma.tallyValidationRun.update).toHaveBeenCalledWith({
        where: { id: 'run-1' },
        data: expect.objectContaining({ status: 'COMPLETED' }),
      });
    });

    it('should return true for success string response', async () => {
      const result = await service.postSyncVerify('v-1', 'c-1', '<CREATED>1</CREATED>');
      expect(result).toBe(true);
      expect(prisma.tallyValidationRun.update).toHaveBeenCalledWith({
        where: { id: 'run-1' },
        data: expect.objectContaining({ status: 'COMPLETED' }),
      });
    });

    it('should return false for failure', async () => {
      const result = await service.postSyncVerify('v-1', 'c-1', '<STATUS>0</STATUS>');
      expect(result).toBe(false);
      expect(prisma.tallyValidationRun.update).toHaveBeenCalledWith({
        where: { id: 'run-1' },
        data: expect.objectContaining({ status: 'FAILED' }),
      });
    });
  });
});
