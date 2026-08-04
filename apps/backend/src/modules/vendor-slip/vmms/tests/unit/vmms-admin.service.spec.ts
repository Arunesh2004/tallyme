import { Test, TestingModule } from '@nestjs/testing';
import { VmmsAdminService } from '../../application/vmms-admin.service';
import { VmmsAdminRepository } from '../../infrastructure/repositories/vmms-admin.repository';

describe('VmmsAdminService', () => {
  let service: VmmsAdminService;
  let repo: jest.Mocked<VmmsAdminRepository>;

  beforeEach(async () => {
    const mockRepo = {
      resolveMismatch: jest.fn(),
      createAlias: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VmmsAdminService,
        { provide: VmmsAdminRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<VmmsAdminService>(VmmsAdminService);
    repo = module.get(VmmsAdminRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should delegate resolveMismatch to repository', async () => {
    repo.resolveMismatch.mockResolvedValue();
    await service.resolveMismatch(
      { invoiceId: 'inv-1', verdict: 'VMMS_CORRECT', proposedAlias: 'alias' },
      'user-1',
    );
    expect(repo.resolveMismatch).toHaveBeenCalledWith(
      'inv-1',
      'VMMS_CORRECT',
      undefined,
      'alias',
      'user-1',
    );
  });

  it('should delegate createAlias to repository', async () => {
    const mockAlias = { id: 'alias-1' };
    repo.createAlias.mockResolvedValue(mockAlias);

    const result = await service.createAlias(
      { vendorLedgerId: 'leg-1', aliasText: 'test' },
      'user-1',
    );
    expect(result).toBe(mockAlias);
    expect(repo.createAlias).toHaveBeenCalledWith(
      'leg-1',
      'test',
      undefined,
      'user-1',
    );
  });
});
