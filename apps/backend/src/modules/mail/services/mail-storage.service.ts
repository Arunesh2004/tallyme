import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../../core/logger/logger.service';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
@Injectable()
export class MailStorageService {
  constructor(
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {}

  async storeAttachment(
    filename: string,
    buffer: Buffer,
  ): Promise<{
    path: string;
    checksum: string;
    mimeType: string;
    filename: string;
  }> {
    const storagePath =
      this.configService.get<string>('mail.storage.path') ||
      path.join(process.cwd(), 'storage');

    if (!fs.existsSync(storagePath)) {
      fs.mkdirSync(storagePath, { recursive: true });
    }

    const uniqueFilename = `${Date.now()}_${filename}`;
    const filePath = path.join(storagePath, uniqueFilename);

    fs.writeFileSync(filePath, buffer);

    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

    // Extrapolate a basic mime type from extension if needed, though usually passed from upstream
    const ext = path.extname(filename).toLowerCase();
    const mimeType =
      ext === '.pdf' ? 'application/pdf' : 'application/octet-stream';

    this.logger.debug(
      `Stored attachment ${filename} to ${filePath} (checksum: ${checksum})`,
      'MailStorageService',
    );

    return { path: filePath, checksum, mimeType, filename };
  }
}
