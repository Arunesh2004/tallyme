import { describe, it, expect, vi } from 'vitest';
import { MasterService } from '../../../../modules/accounting/masters/services/MasterService';
import { MasterType } from '../../../../modules/accounting/masters/entities/MasterType';
import { CreateMasterDTO } from '../../../../modules/accounting/masters/dto/CreateMasterDTO';

describe('MasterService', () => {
  it('should successfully orchestrate creating a master', async () => {
    const mockRepository = {
      saveMaster: vi.fn().mockResolvedValue({
        success: true,
        message: 'Master successfully created in Tally Prime.'
      })
    } as any;

    const service = new MasterService(mockRepository);

    const dto = {
      masterType: MasterType.CostCentre,
      name: 'Marketing',
    } as CreateMasterDTO;

    const result = await service.createMaster(dto);

    expect(result.success).toBe(true);
    expect(mockRepository.saveMaster).toHaveBeenCalled();
  });

  it('should fail if Main Location godown is created', async () => {
    const mockRepository = {
      saveMaster: vi.fn()
    } as any;

    const service = new MasterService(mockRepository);

    const dto = {
      masterType: MasterType.Godown,
      name: 'Main Location',
    } as CreateMasterDTO;

    const result = await service.createMaster(dto);

    expect(result.success).toBe(false);
    expect(result.message).toContain('reserved default Godown name');
    expect(mockRepository.saveMaster).not.toHaveBeenCalled();
  });
});
