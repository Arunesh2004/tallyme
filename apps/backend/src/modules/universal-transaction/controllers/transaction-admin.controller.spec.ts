import { Test, TestingModule } from '@nestjs/testing';
import { TransactionAdminController } from './transaction-admin.controller';
import { TransactionOutboxRepository } from '../repositories/transaction-outbox.repository';
import { AuditService } from '../../audit/audit.service';
import { LoggerService } from '../../../core/logger/logger.service';
import { Reflector } from '@nestjs/core';

describe('TransactionAdminController', () => {
  let controller: TransactionAdminController;

  const mockOutboxRepo = {
    findDeadLetters: jest.fn(),
    getDeadLetterById: jest.fn(),
    replayDeadLetter: jest.fn(),
    replayAllDeadLetters: jest.fn(),
    deleteDeadLetter: jest.fn(),
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionAdminController],
      providers: [
        { provide: TransactionOutboxRepository, useValue: mockOutboxRepo },
        { provide: AuditService, useValue: mockAuditService },
        { provide: LoggerService, useValue: { log: jest.fn(), error: jest.fn(), warn: jest.fn() } },
        Reflector,
      ],
    }).compile();

    controller = module.get<TransactionAdminController>(TransactionAdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDeadLetters', () => {
    it('should call repository with default skip and take', async () => {
      await controller.getDeadLetters();
      expect(mockOutboxRepo.findDeadLetters).toHaveBeenCalledWith(0, 50);
    });

    it('should call repository with provided skip and take', async () => {
      await controller.getDeadLetters('10', '20');
      expect(mockOutboxRepo.findDeadLetters).toHaveBeenCalledWith(10, 20);
    });
  });

  describe('getDeadLetter', () => {
    it('should call repository to get single dead letter', async () => {
      await controller.getDeadLetter('uuid-1');
      expect(mockOutboxRepo.getDeadLetterById).toHaveBeenCalledWith('uuid-1');
    });
  });

  describe('replayDeadLetter', () => {
    it('should replay dead letter and log audit event', async () => {
      mockOutboxRepo.replayDeadLetter.mockResolvedValue({ success: true });
      
      const req = { user: { id: 'user1' } };
      const result = await controller.replayDeadLetter('uuid-1', req);
      
      expect(mockOutboxRepo.replayDeadLetter).toHaveBeenCalledWith('uuid-1');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'REPLAY_DEAD_LETTER',
          userId: 'user1',
          entityId: 'uuid-1'
        })
      );
      expect(result).toEqual({ success: true });
    });

    it('should use system as fallback user for audit', async () => {
      await controller.replayDeadLetter('uuid-1', {});
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'system' })
      );
    });
  });

  describe('replayAllDeadLetters', () => {
    it('should bulk replay and log audit event', async () => {
      mockOutboxRepo.replayAllDeadLetters.mockResolvedValue(5);
      
      const req = { user: { id: 'user2' } };
      const result = await controller.replayAllDeadLetters(req);
      
      expect(mockOutboxRepo.replayAllDeadLetters).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'BULK_REPLAY_DEAD_LETTERS',
          userId: 'user2'
        })
      );
      expect(result).toEqual({ status: 'SUCCESS', count: 5 });
    });
  });

  describe('deleteDeadLetter', () => {
    it('should delete dead letter and log audit event', async () => {
      mockOutboxRepo.deleteDeadLetter.mockResolvedValue({ deleted: true });
      
      const req = { user: { id: 'user3' } };
      const result = await controller.deleteDeadLetter('uuid-2', req);
      
      expect(mockOutboxRepo.deleteDeadLetter).toHaveBeenCalledWith('uuid-2');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DELETE_DEAD_LETTER',
          userId: 'user3',
          entityId: 'uuid-2'
        })
      );
      expect(result).toEqual({ deleted: true });
    });
  });
});
