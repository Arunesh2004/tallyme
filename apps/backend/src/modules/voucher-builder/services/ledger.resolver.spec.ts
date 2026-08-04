import { Test, TestingModule } from '@nestjs/testing';
import { LedgerResolver } from './ledger.resolver';
import { VOUCHER_REPOSITORY } from '../constants/voucher.constants';
import { NotFoundException } from '@nestjs/common';

describe('LedgerResolver', () => {
  let resolver: LedgerResolver;
  
  const mockRepo = {
    findLedgerByName: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LedgerResolver,
        { provide: VOUCHER_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    resolver = module.get<LedgerResolver>(LedgerResolver);
  });

  describe('resolveDebitLedger', () => {
    it('should return ledger', async () => {
      mockRepo.findLedgerByName.mockResolvedValue({ id: '1', name: 'Gateway' });
      const res = await resolver.resolveDebitLedger({ gatewayLedgerName: 'Gateway' });
      expect(res.name).toBe('Gateway');
    });

    it('should throw if not found', async () => {
      mockRepo.findLedgerByName.mockResolvedValue(null);
      await expect(resolver.resolveDebitLedger({ gatewayLedgerName: 'Gateway' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('resolveCreditLedger', () => {
    it('should return ledger', async () => {
      mockRepo.findLedgerByName.mockResolvedValue({ id: '2', name: 'Tuition Fees' });
      const res = await resolver.resolveCreditLedger('Tuition');
      expect(mockRepo.findLedgerByName).toHaveBeenCalledWith('Tuition Fees');
      expect(res.name).toBe('Tuition Fees');
    });

    it('should throw if not found', async () => {
      mockRepo.findLedgerByName.mockResolvedValue(null);
      await expect(resolver.resolveCreditLedger('Tuition')).rejects.toThrow(NotFoundException);
    });
  });

  describe('resolveAdvanceLedger', () => {
    it('should return ledger', async () => {
      mockRepo.findLedgerByName.mockResolvedValue({ id: '3', name: 'Student Advance' });
      const res = await resolver.resolveAdvanceLedger();
      expect(res.name).toBe('Student Advance');
    });

    it('should throw if not found', async () => {
      mockRepo.findLedgerByName.mockResolvedValue(null);
      await expect(resolver.resolveAdvanceLedger()).rejects.toThrow(NotFoundException);
    });
  });
});
