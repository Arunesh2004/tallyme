import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaVoucherRepository } from '../../../../modules/accounting/voucher/repositories/PrismaVoucherRepository';
import { prisma } from '../../../../shared/db/prisma';

vi.mock('../../../../shared/db/prisma', () => {
  return {
    prisma: {
      $transaction: vi.fn(),
      accountingVoucher: {
        create: vi.fn(),
      },
      eventOutbox: {
        create: vi.fn(),
      }
    }
  };
});

describe('PrismaVoucherRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully save voucher and event in a transaction', async () => {
    const repository = new PrismaVoucherRepository();
    const mockVoucher = {
      voucherNumber: 'V-123',
      voucherType: 'Sales',
      date: new Date('2023-01-01'),
      narration: 'Test voucher'
    };

    // Mock successful transaction execution
    (prisma.$transaction as any).mockImplementation(async (callback: any) => {
      await callback(prisma);
    });

    const result = await repository.saveVoucher(mockVoucher as any);

    expect(result.success).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.accountingVoucher.create).toHaveBeenCalled();
    expect(prisma.eventOutbox.create).toHaveBeenCalled();
    
    const outboxCall = (prisma.eventOutbox.create as any).mock.calls[0][0];
    expect(outboxCall.data.eventType).toBe('VoucherCreated');
  });

  it('should handle errors gracefully', async () => {
    const repository = new PrismaVoucherRepository();
    const mockVoucher = {
      voucherType: 'Sales',
      date: new Date()
    };

    (prisma.$transaction as any).mockRejectedValue(new Error('DB Connection Failed'));

    const result = await repository.saveVoucher(mockVoucher as any);

    expect(result.success).toBe(false);
    expect(result.message).toContain('Failed to persist');
  });
});
