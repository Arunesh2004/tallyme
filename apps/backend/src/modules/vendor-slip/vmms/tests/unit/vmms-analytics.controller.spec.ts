import { Test, TestingModule } from '@nestjs/testing';
import { VmmsAnalyticsController } from '../../api/vmms-analytics.controller';
import { VmmsComparisonService } from '../../application/vmms-comparison.service';
import { GetMismatchesQueryDto } from '../../api/dto/vmms-analytics.dto';

describe('VmmsAnalyticsController', () => {
  let controller: VmmsAnalyticsController;
  let service: jest.Mocked<VmmsComparisonService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VmmsAnalyticsController],
      providers: [
        {
          provide: VmmsComparisonService,
          useValue: {
            getMismatchesPaginated: jest.fn(),
            getSummary: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<VmmsAnalyticsController>(VmmsAnalyticsController);
    service = module.get(
      VmmsComparisonService,
    ) as jest.Mocked<VmmsComparisonService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSummary', () => {
    it('should call service with proper arguments', async () => {
      const mockResult = { totalInvoices: 100 };
      (service.getSummary as any).mockResolvedValue(mockResult);

      const query = { companyId: 'comp-1', startDate: '2026-01-01T00:00:00Z' };
      const res = await controller.getSummary(query as any);

      expect(res).toEqual(mockResult);
      expect(service.getSummary).toHaveBeenCalledWith(
        'comp-1',
        new Date('2026-01-01T00:00:00Z'),
        undefined,
      );
    });
  });

  describe('getMismatches', () => {
    it('should correctly format response according to DTO spec', async () => {
      service.getMismatchesPaginated.mockResolvedValue({
        data: [],
        hasNextPage: true,
        nextCursor: 'cursor-123',
      });

      const query: GetMismatchesQueryDto = {
        limit: 10,
        companyId: 'comp-1',
      };

      const response = await controller.getMismatches(query);

      expect(response).toEqual({
        data: [],
        meta: {
          nextCursor: 'cursor-123',
          hasNextPage: true,
          limit: 10,
        },
      });
      expect(service.getMismatchesPaginated).toHaveBeenCalledWith(
        10,
        undefined,
        'comp-1',
        undefined,
        undefined,
      );
    });
  });
});
