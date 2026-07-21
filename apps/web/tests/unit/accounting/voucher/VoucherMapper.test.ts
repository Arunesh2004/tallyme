import { describe, it, expect } from 'vitest';
import { VoucherMapper } from '../../../../modules/accounting/voucher/mappers/VoucherMapper';
import { CreateVoucherDTO } from '../../../../modules/accounting/voucher/dto/CreateVoucherDTO';
import { VoucherType } from '../../../../modules/accounting/voucher/enums/VoucherType';

describe('VoucherMapper', () => {
  it('should map DTO to Entity and remove date hyphens', () => {
    const dto: CreateVoucherDTO = {
      voucherType: VoucherType.Sales,
      date: '2023-05-01',
      effectiveDate: '2023-05-02',
      ledgerEntries: [
        { ledgerName: 'Cash', amount: 100, isDeemedPositive: true },
        { ledgerName: 'Sales', amount: 100, isDeemedPositive: false }
      ]
    };

    const entity = VoucherMapper.toEntity(dto);

    expect(entity.date).toBe('20230501');
    expect(entity.effectiveDate).toBe('20230502');
    expect(entity.ledgerEntries.length).toBe(2);
  });
});
