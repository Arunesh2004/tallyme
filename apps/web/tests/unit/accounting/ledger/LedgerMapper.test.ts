import { describe, it, expect } from 'vitest';
import { LedgerMapper } from '../../../../modules/accounting/ledger/mappers/LedgerMapper';
import { CreateLedgerDTO } from '../../../../modules/accounting/ledger/dto/CreateLedgerDTO';

describe('LedgerMapper', () => {
  it('should map DTO to Entity and provide defaults', () => {
    const dto: CreateLedgerDTO = {
      name: 'ABC Corp',
      parentGroup: 'Sundry Debtors',
    };

    const entity = LedgerMapper.toEntity(dto);

    expect(entity.name).toBe('ABC Corp');
    expect(entity.openingBalance).toBe(0);
    expect(entity.openingBalanceType).toBe('Credit');
  });
});
