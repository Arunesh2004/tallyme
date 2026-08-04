import { Test, TestingModule } from '@nestjs/testing';
import { CostCentreResolverService } from './cost-centre-resolver.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { Logger } from '@nestjs/common';

describe('CostCentreResolverService', () => {
  let service: CostCentreResolverService;

  const mockPrisma = {};

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CostCentreResolverService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CostCentreResolverService>(CostCentreResolverService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return the class as cost centre when category is CLASS', async () => {
    const result = await service.resolveCostCentre('Class 10 A', 'CLASS');
    expect(result).toMatchObject({
      selectedCostCentre: 'Class 10 A',
      confidence: 90,
      reason: 'Matched class category for student fee.',
      source: 'CostCentreResolver',
    });
  });

  it('should return General as fallback cost centre for other categories', async () => {
    const result = await service.resolveCostCentre('Marketing Dept', 'DEPARTMENT');
    expect(result).toMatchObject({
      selectedCostCentre: 'General',
      confidence: 50,
      reason: 'Fallback cost centre chosen.',
      source: 'CostCentreResolver',
    });
  });
});
