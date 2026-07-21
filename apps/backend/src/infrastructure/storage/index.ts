// src/infrastructure/storage/index.ts
import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface FileMetadata {
  id: string;
  originalName: string;
  storedName: string;
  checksum: string;
  contentType: string;
  size: number;
  provider: string;
  path: string;
}

export interface StorageProvider {
  store(
    fileBuffer: Buffer,
    originalName: string,
    contentType: string,
  ): Promise<FileMetadata>;
  retrieve(fileId: string): Promise<Buffer>;
  delete(fileId: string): Promise<void>;
}

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly baseDir = path.join(process.cwd(), 'storage', 'invoices');

  private generateChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  private sanitizeFilename(originalName: string): string {
    return originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
  }

  async store(
    fileBuffer: Buffer,
    originalName: string,
    contentType: string,
  ): Promise<FileMetadata> {
    const checksum = this.generateChecksum(fileBuffer);
    const date = new Date();
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');

    const targetDir = path.join(this.baseDir, year, month);
    await fs.mkdir(targetDir, { recursive: true });

    const safeName = this.sanitizeFilename(originalName);
    const storedName = `${crypto.randomUUID()}-${safeName}`;
    const fullPath = path.join(targetDir, storedName);

    await fs.writeFile(fullPath, fileBuffer);

    return {
      id: crypto.randomUUID(),
      originalName,
      storedName,
      checksum,
      contentType,
      size: fileBuffer.length,
      provider: 'LOCAL',
      path: fullPath,
    };
  }

  async retrieve(fileId: string): Promise<Buffer> {
    // Requires DB lookup for full path in real impl. Stubbed for pure interface compliance
    throw new Error('Method not implemented.');
  }

  async delete(fileId: string): Promise<void> {
    // Requires DB lookup
    throw new Error('Method not implemented.');
  }
}
