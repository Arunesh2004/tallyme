import { describe, it, expect, vi } from 'vitest';
import { LedgerService } from '../../../../modules/accounting/ledger/services/LedgerService';
import { CreateLedgerDTO } from '../../../../modules/accounting/ledger/dto/CreateLedgerDTO';

describe('LedgerService', () => {
  it('should successfully orchestrate a valid ledger creation', async () => {
    const mockRepository = {
      saveLedger: vi.fn().mockResolvedValue({
        success: true,
        message: 'Ledger successfully created in Tally Prime.'
      })
    } as any;

    const service = new LedgerService(mockRepository);

    const dto: CreateLedgerDTO = {
      name: 'ABC Corp',
      parentGroup: 'Sundry Debtors',
      openingBalance: 100,
      openingBalanceType: 'Debit'
    };

    const result = await service.createLedger(dto);

    expect(result.success).toBe(true);
    expect(mockRepository.saveLedger).toHaveBeenCalled();
  });

  it('should return failure on schema validation error', async () => {
    const mockRepository = {
      saveLedger: vi.fn()
    } as any;

    const service = new LedgerService(mockRepository);

    const dto: CreateLedgerDTO = {
      name: '', // Invalid name
      parentGroup: 'Sundry Debtors',
    };

    const result = await service.createLedger(dto);

    expect(result.success).toBe(false);
    expect(result.message).toContain('Schema validation failed');
    expect(mockRepository.saveLedger).not.toHaveBeenCalled();
  });
});
