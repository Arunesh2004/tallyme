import { Test, TestingModule } from '@nestjs/testing';
import { BackupService } from './backup.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';

describe('BackupService', () => {
  let service: BackupService;

  const mockPrisma = {
    recoveryTestLog: {
      create: jest.fn(),
    },
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackupService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<BackupService>(BackupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleDailyBackup', () => {
    it('should complete successfully when DATABASE_URL is set', async () => {
      process.env.DATABASE_URL = 'postgresql://test:pass@localhost:5432/testdb';

      await expect(service.handleDailyBackup()).resolves.not.toThrow();
    });

    it('should handle missing DATABASE_URL gracefully (logs error, does not throw)', async () => {
      const originalUrl = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;

      await expect(service.handleDailyBackup()).resolves.not.toThrow();

      process.env.DATABASE_URL = originalUrl;
    });
  });

  describe('simulateRestore', () => {
    it('should return success and log a successful restore', async () => {
      mockPrisma.recoveryTestLog.create.mockResolvedValue({ id: 'log-1', status: 'SUCCESS' });

      const result = await service.simulateRestore('backup-001');

      expect(result).toEqual({ success: true });
      expect(mockPrisma.recoveryTestLog.create).toHaveBeenCalledWith({
        data: {
          backupId: 'backup-001',
          status: 'SUCCESS',
          report: { verifiedTables: 45, corruptions: 0 },
          performedBy: 'SYSTEM_DR_TEST',
        },
      });
    });

    it('should return failure and log a failed restore when db throws', async () => {
      mockPrisma.recoveryTestLog.create
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce({ id: 'log-2', status: 'FAILED' });

      const result = await service.simulateRestore('backup-002');

      expect(result).toEqual({ success: false });
      // The failure log should be created
      expect(mockPrisma.recoveryTestLog.create).toHaveBeenCalledWith({
        data: {
          backupId: 'backup-002',
          status: 'FAILED',
          report: { error: expect.stringContaining('DB error') },
          performedBy: 'SYSTEM_DR_TEST',
        },
      });
    });
  });
});
