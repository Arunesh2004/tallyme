import { describe, it, expect, vi } from 'vitest';
import { VoucherService } from '../../../../modules/accounting/voucher/services/VoucherService';
import { CreateVoucherDTO } from '../../../../modules/accounting/voucher/dto/CreateVoucherDTO';
import { VoucherType } from '../../../../modules/accounting/voucher/enums/VoucherType';

describe('VoucherService', () => {
  it('should successfully orchestrate a valid voucher creation', async () => {
    const mockRepository = {
      saveVoucher: vi.fn().mockResolvedValue({
        success: true,
        message: 'Voucher successfully created in Tally Prime.'
      })
    } as any;

    const service = new VoucherService(mockRepository);

    const dto: CreateVoucherDTO = {
      voucherType: VoucherType.Sales,
      date: '2023-05-01',
      ledgerEntries: [
        { ledgerName: 'Cash', amount: 100, isDeemedPositive: true },
        { ledgerName: 'Sales', amount: 100, isDeemedPositive: false }
      ]
    };

    const result = await service.createVoucher(dto);

    expect(result.success).toBe(true);
    expect(mockRepository.saveVoucher).toHaveBeenCalled();
  });

  it('should return failure on unbalanced voucher', async () => {
    const mockRepository = {
      saveVoucher: vi.fn()
    } as any;

    const service = new VoucherService(mockRepository);

    const dto: CreateVoucherDTO = {
      voucherType: VoucherType.Sales,
      date: '2023-05-01',
      ledgerEntries: [
        { ledgerName: 'Cash', amount: 100, isDeemedPositive: true },
        { ledgerName: 'Sales', amount: 90, isDeemedPositive: false }
      ]
    };

    const result = await service.createVoucher(dto);

    expect(result.success).toBe(false);
    expect(result.message).toContain('unbalanced');
    expect(mockRepository.saveVoucher).not.toHaveBeenCalled();
  });
});
