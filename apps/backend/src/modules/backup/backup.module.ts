import { Module } from '@nestjs/common';
import { BackupService } from './backup.service';
import { PrismaModule } from '../../infrastructure/database/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [BackupService],
  exports: [BackupService],
})
export class BackupModule {}
