import { Test, TestingModule } from '@nestjs/testing';
import { VoucherBuilderEngine } from './voucher-builder.engine';
import { VoucherStrategyFactory } from './strategies/voucher.strategy.factory';

describe('VoucherBuilderEngine', () => {
  let engine: VoucherBuilderEngine;
  
  const mockStrategy = {
    build: jest.fn(),
  };

  const mockFactory = {
    getStrategy: jest.fn().mockReturnValue(mockStrategy),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoucherBuilderEngine,
        { provide: VoucherStrategyFactory, useValue: mockFactory },
      ],
    }).compile();

    engine = module.get<VoucherBuilderEngine>(VoucherBuilderEngine);
  });

  it('should resolve strategy and build voucher', async () => {
    mockStrategy.build.mockResolvedValue({ status: 'VALIDATED' });
    const res = await engine.build({ voucherType: 'PURCHASE' });
    expect(mockFactory.getStrategy).toHaveBeenCalledWith('PURCHASE');
    expect(mockStrategy.build).toHaveBeenCalledWith({ voucherType: 'PURCHASE' });
    expect(res.status).toBe('VALIDATED');
  });

  it('should default to RECEIPT if no type provided', async () => {
    mockStrategy.build.mockResolvedValue({ status: 'VALIDATED' });
    await engine.build({});
    expect(mockFactory.getStrategy).toHaveBeenCalledWith('RECEIPT');
  });

  it('should throw if factory throws', async () => {
    mockFactory.getStrategy.mockImplementation(() => { throw new Error('Unsupported'); });
    await expect(engine.build({ voucherType: 'UNSUPPORTED' })).rejects.toThrow('Unsupported');
  });
});
