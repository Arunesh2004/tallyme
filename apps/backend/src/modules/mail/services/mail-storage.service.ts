import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../../core/logger/logger.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailStorageService {
  constructor(
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async storeAttachment(filename: string, buffer: Buffer): Promise<string> {
    const storagePath =
      this.configService.get<string>('mail.storage.path') || './storage';
    const fakePath = `${storagePath}/${Date.now()}_${filename}`;
    // Infrastructure abstraction only - actual fs logic omitted
    this.logger.debug(
      `Storing attachment ${filename} to ${fakePath}`,
      'MailStorageService',
    );
    return fakePath;
  }
}
