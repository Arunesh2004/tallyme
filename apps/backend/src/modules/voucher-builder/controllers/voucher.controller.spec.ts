import { Test, TestingModule } from '@nestjs/testing';
import { VoucherController } from './voucher.controller';
import { ProcessVoucherBuilderUseCase } from '../use-cases/process-voucher-builder.use-case';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../auth/authorization/guards/permission.guard';
describe('VoucherController', () => {
  let controller: VoucherController;
  
  const mockUseCase = {
    execute: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VoucherController],
      providers: [
        { provide: ProcessVoucherBuilderUseCase, useValue: mockUseCase },
      ],
    })
    .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
    .overrideGuard(PermissionGuard).useValue({ canActivate: () => true })
    .compile();

    controller = module.get<VoucherController>(VoucherController);
  });

  it('should process voucher building', async () => {
    const res = await controller.process({ feeAllocationCandidateId: 'fac-1' }, { user: { tenantId: 'c1' } });
    expect(mockUseCase.execute).toHaveBeenCalledWith({ feeAllocationCandidateId: 'fac-1', companyId: 'c1' });
    expect(res.success).toBe(true);
  });
});
