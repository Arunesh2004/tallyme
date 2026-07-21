import { DuplicatePaymentRule } from './duplicate-payment.rule';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

describe('DuplicatePaymentRule', () => {
  let rule: DuplicatePaymentRule;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      feeAllocationCandidate: {
        findFirst: jest.fn(),
      },
    };
    rule = new DuplicatePaymentRule(prisma as unknown as PrismaService);
  });

  it('should ignore if no transactionId or utr is provided', async () => {
    const result = await rule.evaluate({ amount: 1000 }, {});
    expect(result.isValid).toBe(true);
    expect(prisma.feeAllocationCandidate.findFirst).not.toHaveBeenCalled();
  });

  it('should flag duplicate if historical allocation exists', async () => {
    prisma.feeAllocationCandidate.findFirst.mockResolvedValue({
      id: 'existing_alloc_id',
    });

    const result = await rule.evaluate(
      { transactionId: 'TX123', gateway: 'razorpay' },
      {},
    );

    expect(result.isValid).toBe(false);
    expect(result.isDuplicate).toBe(true);
    expect(result.statusModifier).toBe('DUPLICATE_PAYMENT');
    expect(prisma.feeAllocationCandidate.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          studentPaymentCandidate: {
            paymentCandidate: {
              OR: [{ transactionId: 'TX123' }, { utr: undefined }],
              gateway: 'razorpay',
            },
          },
          validationStatus: {
            not: 'INVALID',
          },
        }),
      }),
    );
  });

  it('should pass if no historical allocation exists', async () => {
    prisma.feeAllocationCandidate.findFirst.mockResolvedValue(null);

    const result = await rule.evaluate(
      { transactionId: 'TX123', gateway: 'razorpay' },
      {},
    );

    expect(result.isValid).toBe(true);
    expect(result.isDuplicate).toBeFalsy();
  });
});
