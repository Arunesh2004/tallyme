import { Test, TestingModule } from '@nestjs/testing';
import { VmmsReplayController } from '../../api/vmms-replay.controller';
import { VmmsReplayService } from '../../application/vmms-replay.service';
import { ReplayRequestDto } from '../../api/dto/vmms-replay.dto';

describe('VmmsReplayController', () => {
  let controller: VmmsReplayController;
  let service: jest.Mocked<VmmsReplayService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VmmsReplayController],
      providers: [
        {
          provide: VmmsReplayService,
          useValue: {
            replayInvoice: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<VmmsReplayController>(VmmsReplayController);
    service = module.get(VmmsReplayService) as jest.Mocked<VmmsReplayService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('simulate', () => {
    it('should call replayService and return result', async () => {
      const mockResult = {
        invoiceCandidateId: 'inv-123',
        originalDecision: {
          stage: 'NONE',
          vendorLedgerId: null,
          confidence: 0,
        },
        simulatedDecision: {
          stage: 'NONE',
          vendorLedgerId: null,
          confidence: 0,
        },
        diffStatus: 'IDENTICAL',
      };

      service.replayInvoice.mockResolvedValue(mockResult);

      const request: ReplayRequestDto = { invoiceCandidateId: 'inv-123' };
      const response = await controller.simulate(request);

      expect(response).toEqual(mockResult);
      expect(service.replayInvoice).toHaveBeenCalledWith('inv-123');
    });
  });
});
