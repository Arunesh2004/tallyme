import { Test, TestingModule } from '@nestjs/testing';
import { VmmsAdminController } from '../../api/vmms-admin.controller';
import { VmmsAdminService } from '../../application/vmms-admin.service';

describe('VmmsAdminController', () => {
  let controller: VmmsAdminController;
  let service: jest.Mocked<VmmsAdminService>;

  beforeEach(async () => {
    const mockService = {
      resolveMismatch: jest.fn(),
      createAlias: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VmmsAdminController],
      providers: [{ provide: VmmsAdminService, useValue: mockService }],
    }).compile();

    controller = module.get<VmmsAdminController>(VmmsAdminController);
    service = module.get(VmmsAdminService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('resolveMismatch', () => {
    it('should call service and return void', async () => {
      service.resolveMismatch.mockResolvedValue();
      const dto = { invoiceId: 'uuid', verdict: 'VMMS_CORRECT' as const };
      await expect(controller.resolveMismatch(dto)).resolves.toBeUndefined();
      expect(service.resolveMismatch).toHaveBeenCalledWith(dto, 'admin-user');
    });
  });

  describe('createAlias', () => {
    it('should call service and return alias', async () => {
      const mockAlias = { id: 'alias-1', aliasText: 'TEST' };
      service.createAlias.mockResolvedValue(mockAlias);
      const dto = { vendorLedgerId: 'uuid', aliasText: 'test' };

      const result = await controller.createAlias(dto);
      expect(result).toEqual(mockAlias);
      expect(service.createAlias).toHaveBeenCalledWith(dto, 'admin-user');
    });
  });
});
