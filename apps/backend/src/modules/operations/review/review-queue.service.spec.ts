import { Test, TestingModule } from '@nestjs/testing';
import { ReviewQueueService } from './review-queue.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

describe('ReviewQueueService', () => {
  let service: ReviewQueueService;
  
  const mockPrisma = {
    document: {
      findMany: jest.fn(),
    },
    approvalRequest: {
      findMany: jest.fn(),
    },
    migrationExecution: {
      findMany: jest.fn(),
    }
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewQueueService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ReviewQueueService>(ReviewQueueService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return categorized review queue items', async () => {
    mockPrisma.document.findMany.mockResolvedValue([
      { id: 'doc1', receivedAt: new Date('2026-08-01') }
    ]);
    mockPrisma.approvalRequest.findMany.mockImplementation((args) => {
      if (args.where.status === 'REJECTED') {
        return Promise.resolve([{ entityId: 'rb1', createdAt: new Date('2026-08-01') }]);
      }
      return Promise.resolve([{ id: 'pa1', createdAt: new Date('2026-08-01') }]);
    });
    mockPrisma.migrationExecution.findMany.mockResolvedValue([
      { id: 'mig1', executedAt: new Date('2026-08-01') }
    ]);

    const queue = await service.getReviewQueue();

    expect(queue.critical.length).toBe(2);
    expect(queue.high.length).toBe(1);
    expect(queue.medium.length).toBe(1);

    expect(queue.high[0]).toMatchObject({
      entityId: 'doc1',
      entityType: 'DOCUMENT',
      priority: 'HIGH'
    });

    expect(queue.critical.some(i => i.entityId === 'rb1' && i.entityType === 'ROLLBACK_EXECUTION')).toBe(true);
    expect(queue.critical.some(i => i.entityId === 'mig1' && i.entityType === 'MIGRATION_EXECUTION')).toBe(true);

    expect(queue.medium[0]).toMatchObject({
      entityId: 'pa1',
      entityType: 'APPROVAL_REQUEST',
      priority: 'MEDIUM'
    });
  });

  it('should handle empty results gracefully', async () => {
    mockPrisma.document.findMany.mockResolvedValue([]);
    mockPrisma.approvalRequest.findMany.mockResolvedValue([]);
    mockPrisma.migrationExecution.findMany.mockResolvedValue([]);

    const queue = await service.getReviewQueue();

    expect(queue.critical.length).toBe(0);
    expect(queue.high.length).toBe(0);
    expect(queue.medium.length).toBe(0);
  });
});
