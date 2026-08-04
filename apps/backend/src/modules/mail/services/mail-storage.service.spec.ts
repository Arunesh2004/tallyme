import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs';
import * as path from 'path';
import { MailStorageService } from './mail-storage.service';
import { LoggerService } from '../../../core/logger/logger.service';
import { ConfigService } from '@nestjs/config';

jest.mock('fs');

describe('MailStorageService', () => {
  let service: MailStorageService;

  const mockLogger = {
    debug: jest.fn(),
    log: jest.fn(),
  } as any;

  const mockConfigService = {
    get: jest.fn(),
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailStorageService,
        { provide: LoggerService, useValue: mockLogger },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<MailStorageService>(MailStorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('storeAttachment', () => {
    beforeEach(() => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    });

    it('should store a PDF attachment and return metadata', async () => {
      mockConfigService.get.mockReturnValue('/tmp/storage');
      const buffer = Buffer.from('PDF content');

      const result = await service.storeAttachment('invoice.pdf', buffer);

      expect(result).toMatchObject({
        mimeType: 'application/pdf',
        filename: 'invoice.pdf',
        checksum: expect.any(String),
        path: expect.stringContaining('invoice.pdf'),
      });
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should return application/octet-stream for non-PDF files', async () => {
      mockConfigService.get.mockReturnValue('/tmp/storage');
      const buffer = Buffer.from('CSV content');

      const result = await service.storeAttachment('data.csv', buffer);

      expect(result.mimeType).toBe('application/octet-stream');
    });

    it('should create storage directory if it does not exist', async () => {
      mockConfigService.get.mockReturnValue('/tmp/new-storage');
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
      const buffer = Buffer.from('content');

      await service.storeAttachment('file.pdf', buffer);

      expect(fs.mkdirSync).toHaveBeenCalledWith('/tmp/new-storage', { recursive: true });
    });

    it('should use cwd-based default storage path when config not set', async () => {
      mockConfigService.get.mockReturnValue(undefined);
      const buffer = Buffer.from('content');

      const result = await service.storeAttachment('doc.pdf', buffer);

      expect(result.path).toContain('storage');
      expect(result.mimeType).toBe('application/pdf');
    });

    it('should compute a valid SHA-256 checksum', async () => {
      mockConfigService.get.mockReturnValue('/tmp/storage');
      const buffer = Buffer.from('test data');
      const expectedChecksum = require('crypto')
        .createHash('sha256')
        .update(buffer)
        .digest('hex');

      const result = await service.storeAttachment('test.txt', buffer);

      expect(result.checksum).toBe(expectedChecksum);
    });

    it('should call logger debug after storage', async () => {
      mockConfigService.get.mockReturnValue('/tmp/storage');
      const buffer = Buffer.from('content');

      await service.storeAttachment('doc.pdf', buffer);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Stored attachment'),
        'MailStorageService',
      );
    });
  });
});
