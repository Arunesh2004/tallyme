import { Test, TestingModule } from '@nestjs/testing';
import { TransactionOutboxRepository } from './transaction-outbox.repository';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { OutboxStatus } from '@prisma/client';

describe('TransactionOutboxRepository', () => {
  let repo: TransactionOutboxRepository;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn().mockImplementation(async (cb) => cb(prisma)),
      transactionOutbox: {
        create: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionOutboxRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repo = module.get<TransactionOutboxRepository>(TransactionOutboxRepository);
  });

  describe('createEvent', () => {
    it('should create a pending event', async () => {
      prisma.transactionOutbox.create.mockResolvedValue({ id: 'evt-1' });
      const result = await repo.createEvent({
        aggregateType: 'User',
        aggregateId: 'u1',
        eventType: 'USER_CREATED',
        payload: { id: 'u1' },
      });
      expect(result.id).toBe('evt-1');
      expect(prisma.transactionOutbox.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: OutboxStatus.PENDING }) })
      );
    });
  });

  describe('claimEvents', () => {
    it('should return empty array if no events found', async () => {
      prisma.transactionOutbox.findMany.mockResolvedValue([]);
      const result = await repo.claimEvents();
      expect(result).toEqual([]);
      expect(prisma.transactionOutbox.updateMany).not.toHaveBeenCalled();
    });

    it('should update and return claimed events', async () => {
      prisma.transactionOutbox.findMany.mockResolvedValue([{ id: 'e1' }, { id: 'e2' }]);
      prisma.transactionOutbox.updateMany.mockResolvedValue({ count: 2 });
      const result = await repo.claimEvents();
      expect(result).toHaveLength(2);
      expect(prisma.transactionOutbox.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['e1', 'e2'] } },
        data: { status: OutboxStatus.PROCESSING },
      });
    });
  });

  describe('markProcessed', () => {
    it('should update status to PROCESSED', async () => {
      prisma.transactionOutbox.update.mockResolvedValue({ id: 'e1' });
      await repo.markProcessed('e1');
      expect(prisma.transactionOutbox.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: OutboxStatus.PROCESSED }) })
      );
    });
  });

  describe('markFailed', () => {
    it('should set status to FAILED and increment retry count if below max', async () => {
      prisma.transactionOutbox.update.mockResolvedValue({ id: 'e1' });
      await repo.markFailed('e1', 'Error', 1, 3);
      expect(prisma.transactionOutbox.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: OutboxStatus.FAILED, retryCount: 2 }) })
      );
    });

    it('should set status to DEAD if max retries reached', async () => {
      prisma.transactionOutbox.update.mockResolvedValue({ id: 'e1' });
      await repo.markFailed('e1', 'Error', 3, 3);
      expect(prisma.transactionOutbox.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: OutboxStatus.DEAD, retryCount: 4 }) })
      );
    });
  });

  describe('deleteOldProcessed', () => {
    it('should delete old events', async () => {
      prisma.transactionOutbox.deleteMany.mockResolvedValue({ count: 10 });
      const result = await repo.deleteOldProcessed(7);
      expect(result).toBe(10);
      expect(prisma.transactionOutbox.deleteMany).toHaveBeenCalled();
    });
  });

  describe('dead letter operations', () => {
    it('findDeadLetters should return list', async () => {
      prisma.transactionOutbox.findMany.mockResolvedValue([{ id: 'dl1' }]);
      const result = await repo.findDeadLetters();
      expect(result).toHaveLength(1);
    });

    it('replayDeadLetter should set to PENDING', async () => {
      prisma.transactionOutbox.update.mockResolvedValue({ id: 'dl1' });
      await repo.replayDeadLetter('dl1');
      expect(prisma.transactionOutbox.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: OutboxStatus.PENDING }) })
      );
    });

    it('replayAllDeadLetters should update many', async () => {
      prisma.transactionOutbox.updateMany.mockResolvedValue({ count: 5 });
      const result = await repo.replayAllDeadLetters();
      expect(result).toBe(5);
    });

    it('getDeadLetterById should return one', async () => {
      prisma.transactionOutbox.findUnique.mockResolvedValue({ id: 'dl1' });
      await repo.getDeadLetterById('dl1');
      expect(prisma.transactionOutbox.findUnique).toHaveBeenCalled();
    });

    it('deleteDeadLetter should delete', async () => {
      prisma.transactionOutbox.delete.mockResolvedValue({ id: 'dl1' });
      await repo.deleteDeadLetter('dl1');
      expect(prisma.transactionOutbox.delete).toHaveBeenCalled();
    });
  });

  describe('rescueStrandedEvents', () => {
    it('should rescue PROCESSING events', async () => {
      prisma.transactionOutbox.updateMany.mockResolvedValue({ count: 3 });
      const result = await repo.rescueStrandedEvents(60);
      expect(result).toBe(3);
      expect(prisma.transactionOutbox.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: OutboxStatus.PENDING }) })
      );
    });
  });
});
