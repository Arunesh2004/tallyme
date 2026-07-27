// src/modules/files/files.module.ts
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { FilesController } from './files.controller';
import { LocalStorageProvider } from '../../infrastructure/storage';
import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { isWorkerMode } from '../../shared/utils/runtime-mode';

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({ storage: undefined }), // memoryStorage is the default for buffer access
  ],
  controllers: isWorkerMode ? [] : [FilesController],
  providers: [LocalStorageProvider],
  exports: [LocalStorageProvider],
})
export class FilesModule {}
