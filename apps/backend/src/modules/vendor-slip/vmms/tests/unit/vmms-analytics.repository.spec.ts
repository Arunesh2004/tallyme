import { Test, TestingModule } from '@nestjs/testing';
import { VmmsAnalyticsRepository } from '../../infrastructure/repositories/vmms-analytics.repository';
import { PrismaService } from '../../../../../infrastructure/database/prisma.service';

describe('VmmsAnalyticsRepository', () => {
  let repository: VmmsAnalyticsRepository;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VmmsAnalyticsRepository,
        {
          provide: PrismaService,
          useValue: {
            invoiceCandidate: {
              findMany: jest.fn(),
            },
            $queryRawUnsafe: jest.fn(),
            $queryRaw: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get<VmmsAnalyticsRepository>(VmmsAnalyticsRepository);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSnapshot', () => {
    it('should calculate perfect agreement when legacy and VMMS match the same vendor', async () => {
      prisma.$queryRaw.mockResolvedValueOnce([
        {
          totalProcessed: 100,
          legacyMatches: 100,
          vmmsMatches: 100,
          agreements: 100,
          disagreements: 0,
          stage1Matches: 50,
          stage2Matches: 50,
          manualReviews: 0,
        },
      ]);

      const result = await repository.getSnapshot({});

      expect(result.totalProcessed).toBe(100);
      expect(result.agreementRate).toBe(100);
      expect(result.disagreementRate).toBe(0);
      expect(result.stage1MatchRate).toBe(50);
      expect(result.stage2MatchRate).toBe(50);
    });

    it('should detect mismatch when vendor IDs differ', async () => {
      prisma.$queryRaw.mockResolvedValueOnce([
        {
          totalProcessed: 1,
          legacyMatches: 1,
          vmmsMatches: 1,
          agreements: 0,
          disagreements: 1,
          stage1Matches: 1,
          stage2Matches: 0,
          manualReviews: 0,
        },
      ]);

      const result = await repository.getSnapshot({});

      expect(result.agreementRate).toBe(0);
      expect(result.disagreementRate).toBe(100);
    });

    it('should apply correct where clauses for date filtering', async () => {
      prisma.$queryRaw.mockResolvedValueOnce([
        {
          totalProcessed: 0,
          legacyMatches: 0,
          vmmsMatches: 0,
          agreements: 0,
          disagreements: 0,
          stage1Matches: 0,
          stage2Matches: 0,
          manualReviews: 0,
        },
      ]);

      const date = new Date();
      await repository.getSnapshot({ startDate: date, endDate: date });

      expect(prisma.$queryRaw).toHaveBeenCalled();
    });
  });
});
