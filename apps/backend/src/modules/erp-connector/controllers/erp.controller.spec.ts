import { Test, TestingModule } from '@nestjs/testing';
import { ERPController } from './erp.controller';
import { ProcessERPSyncUseCase } from '../use-cases/process-erp-sync.use-case';
import { ERPHealthService } from '../services/health.service';
import { ERP_ADAPTERS } from '../constants/erp.constants';

describe('ERPController', () => {
  let controller: ERPController;

  const mockUseCase = {
    execute: jest.fn(),
  };

  const mockHealthService = {
    checkHealth: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ERPController],
      providers: [
        { provide: ProcessERPSyncUseCase, useValue: mockUseCase },
        { provide: ERPHealthService, useValue: mockHealthService },
      ],
    }).compile();

    controller = module.get<ERPController>(ERPController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('process', () => {
    it('should initiate sync using the use case', async () => {
      const dto = { voucherCandidateId: 'v-1' };
      mockUseCase.execute.mockResolvedValue(undefined);

      const result = await controller.process(dto);

      expect(mockUseCase.execute).toHaveBeenCalledWith('v-1', 1);
      expect(result).toEqual({ success: true, message: 'ERP sync process initiated' });
    });
  });

  describe('checkHealth', () => {
    it('should check health of default adapter and return status', async () => {
      mockHealthService.checkHealth.mockResolvedValue(true);

      const result = await controller.checkHealth();

      expect(mockHealthService.checkHealth).toHaveBeenCalledWith(ERP_ADAPTERS.TALLY_PRIME_V1);
      expect(result).toEqual({ success: true, adapter: ERP_ADAPTERS.TALLY_PRIME_V1, isHealthy: true });
    });

    it('should return false if adapter is unhealthy', async () => {
      mockHealthService.checkHealth.mockResolvedValue(false);

      const result = await controller.checkHealth();

      expect(result).toEqual({ success: true, adapter: ERP_ADAPTERS.TALLY_PRIME_V1, isHealthy: false });
    });
  });
});
