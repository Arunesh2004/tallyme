import { Module } from '@nestjs/common';
import { MailController } from './controllers/mail.controller';
import { MAIL_REPOSITORY } from './constants/mail.constants';
import { PrismaMailRepository } from './repositories/prisma-mail.repository';
import { MailParserService } from './services/mail-parser.service';
import { MailStorageService } from './services/mail-storage.service';
import { GmailClientService } from './services/gmail-client.service';
import { MailProcessingService } from './services/mail-processing.service';
import { MailListenerService } from './services/mail-listener.service';
import { MailWorker } from './queue/mail.worker';
import { BullModule } from '@nestjs/bullmq';
import { MAIL_PROCESSING_QUEUE } from './constants/mail.constants';

@Module({
  imports: [
    BullModule.registerQueue({
      name: MAIL_PROCESSING_QUEUE,
    }),
  ],
  controllers: [MailController],
  providers: [
    {
      provide: MAIL_REPOSITORY,
      useClass: PrismaMailRepository,
    },
    MailParserService,
    MailStorageService,
    GmailClientService,
    MailProcessingService,
    MailListenerService,
    MailWorker,
  ],
})
export class MailModule {}
