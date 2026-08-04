import { Test, TestingModule } from '@nestjs/testing';
import { PrismaMailRepository } from './prisma-mail.repository';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { LoggerService } from '../../../core/logger/logger.service';

describe('PrismaMailRepository', () => {
  let repository: PrismaMailRepository;

  const mockTx = {
    incomingEmail: { create: jest.fn() },
    emailAttachment: { createMany: jest.fn() },
    emailProcessingLog: { create: jest.fn() },
  };

  const mockPrisma = {
    incomingEmail: {
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    emailProcessingLog: { create: jest.fn() },
    emailAttachment: { create: jest.fn() },
    $transaction: jest.fn((fn: (tx: typeof mockTx) => Promise<any>) => fn(mockTx)),
  } as any;

  const mockLogger = {
    debug: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaMailRepository,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: LoggerService, useValue: mockLogger },
      ],
    }).compile();

    repository = module.get<PrismaMailRepository>(PrismaMailRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findById', () => {
    it('should find an email by id', async () => {
      const email = { id: 'email-1', messageId: 'msg-001' };
      mockPrisma.incomingEmail.findUnique.mockResolvedValue(email);

      const result = await repository.findById('email-1');

      expect(result).toEqual(email);
      expect(mockPrisma.incomingEmail.findUnique).toHaveBeenCalledWith({
        where: { id: 'email-1' },
      });
    });

    it('should return null when email not found', async () => {
      mockPrisma.incomingEmail.findUnique.mockResolvedValue(null);

      const result = await repository.findById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('emailExists', () => {
    it('should return true when email with messageId exists', async () => {
      mockPrisma.incomingEmail.count.mockResolvedValue(1);

      const result = await repository.emailExists('msg-001');

      expect(result).toBe(true);
      expect(mockPrisma.incomingEmail.count).toHaveBeenCalledWith({
        where: { messageId: 'msg-001' },
      });
    });

    it('should return false when email does not exist', async () => {
      mockPrisma.incomingEmail.count.mockResolvedValue(0);

      const result = await repository.emailExists('msg-unknown');
      expect(result).toBe(false);
    });
  });

  describe('saveEmail', () => {
    it('should create an incoming email', async () => {
      const emailData = { messageId: 'msg-001', sender: 'test@test.com' };
      const saved = { id: 'email-1', ...emailData };
      mockPrisma.incomingEmail.create.mockResolvedValue(saved);

      const result = await repository.saveEmail(emailData);

      expect(result).toEqual(saved);
      expect(mockPrisma.incomingEmail.create).toHaveBeenCalledWith({
        data: { ...emailData },
      });
    });
  });

  describe('updateStatus', () => {
    it('should update the status of an email', async () => {
      mockPrisma.incomingEmail.update.mockResolvedValue(undefined);

      await repository.updateStatus('email-1', 'PROCESSED');

      expect(mockPrisma.incomingEmail.update).toHaveBeenCalledWith({
        where: { id: 'email-1' },
        data: { status: 'PROCESSED' },
      });
    });
  });

  describe('logProcessing', () => {
    it('should create a processing log with minimal data', async () => {
      mockPrisma.emailProcessingLog.create.mockResolvedValue(undefined);

      await repository.logProcessing('email-1', 'PROCESSING');

      expect(mockPrisma.emailProcessingLog.create).toHaveBeenCalledWith({
        data: {
          emailId: 'email-1',
          status: 'PROCESSING',
          message: undefined,
          errorDetails: {},
        },
      });
    });

    it('should create a processing log with error details', async () => {
      mockPrisma.emailProcessingLog.create.mockResolvedValue(undefined);

      await repository.logProcessing(
        'email-1',
        'FAILED',
        'Parse error',
        { code: 'PARSE_FAIL' },
      );

      expect(mockPrisma.emailProcessingLog.create).toHaveBeenCalledWith({
        data: {
          emailId: 'email-1',
          status: 'FAILED',
          message: 'Parse error',
          errorDetails: { code: 'PARSE_FAIL' },
        },
      });
    });
  });

  describe('saveAttachment', () => {
    it('should create an email attachment', async () => {
      mockPrisma.emailAttachment.create.mockResolvedValue(undefined);
      const attachment = { filename: 'invoice.pdf', size: 12345 };

      await repository.saveAttachment('email-1', attachment);

      expect(mockPrisma.emailAttachment.create).toHaveBeenCalledWith({
        data: { emailId: 'email-1', filename: 'invoice.pdf', size: 12345 },
      });
    });
  });

  describe('saveEmailWithAttachmentsAndLogs', () => {
    beforeEach(() => {
      mockTx.incomingEmail.create.mockResolvedValue({ id: 'email-new' });
      mockTx.emailAttachment.createMany.mockResolvedValue({ count: 1 });
      mockTx.emailProcessingLog.create.mockResolvedValue(undefined);
    });

    it('should save email, attachments, and log in a transaction', async () => {
      const emailData = { messageId: 'msg-001', sender: 'test@test.com' };
      const attachments = [{ filename: 'doc.pdf', size: 1000 }];
      const logData = { status: 'PROCESSING', message: 'Started' };

      const result = await repository.saveEmailWithAttachmentsAndLogs(
        emailData,
        attachments,
        logData,
      );

      expect(result).toEqual({ id: 'email-new' });
      expect(mockTx.emailAttachment.createMany).toHaveBeenCalledWith({
        data: [{ filename: 'doc.pdf', size: 1000, emailId: 'email-new' }],
      });
      expect(mockTx.emailProcessingLog.create).toHaveBeenCalledWith({
        data: { status: 'PROCESSING', message: 'Started', emailId: 'email-new' },
      });
    });

    it('should skip attachments when array is empty', async () => {
      await repository.saveEmailWithAttachmentsAndLogs(
        { messageId: 'msg-002', sender: 'a@b.com' },
        [],
        null,
      );

      expect(mockTx.emailAttachment.createMany).not.toHaveBeenCalled();
    });

    it('should skip log when logData is null', async () => {
      await repository.saveEmailWithAttachmentsAndLogs(
        { messageId: 'msg-003', sender: 'a@b.com' },
        [],
        null,
      );

      expect(mockTx.emailProcessingLog.create).not.toHaveBeenCalled();
    });
  });
});
