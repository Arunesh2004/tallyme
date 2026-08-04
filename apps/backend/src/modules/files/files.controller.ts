// src/modules/files/files.controller.ts
import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
  NotFoundException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '../auth/guards/permissions.guard';
import { LocalStorageProvider } from '../../infrastructure/storage';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { LoggerService } from '../../core/logger/logger.service';

const ALLOWED_MIMES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/tiff',
];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

@Controller('files')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FilesController {
  constructor(
    private readonly storageProvider: LocalStorageProvider,
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * POST /files/upload
   * 1. Validate MIME type and size
   * 2. Store file to local disk with SHA-256 checksum
   * 3. Check for duplicate (by checksum)
   * 4. Persist Document record to PostgreSQL
   * 5. Return fileId for downstream OCR processing
   */
  @Post('upload')
  @RequirePermissions('Invoice.Upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: any, @Req() req: Request) {
    if (!file) throw new BadRequestException('No file provided');
    if (!ALLOWED_MIMES.includes(file.mimetype))
      throw new BadRequestException('Unsupported file type');
    if (file.size > MAX_SIZE)
      throw new BadRequestException('File exceeds maximum size limit (10 MB)');

    const user = req.user as any;
    const uploadedBy = user?.id ?? 'anonymous';

    // 1. Store the physical file and calculate SHA-256 checksum
    const metadata = await this.storageProvider.store(
      file.buffer,
      file.originalname,
      file.mimetype,
    );

    // 2. Duplicate detection — check if a Document with the same checksum exists
    const existingDocument = await this.prisma.document.findFirst({
      where: { checksum: metadata.checksum },
    });

    if (existingDocument) {
      this.logger.warn(
        `Duplicate file upload detected. Checksum: ${metadata.checksum}. Returning existing document.`,
        'FilesController',
      );
      return {
        fileId: existingDocument.id,
        checksum: metadata.checksum,
        status: 'DUPLICATE',
        message: 'File already exists with this checksum',
      };
    }

    // 3. Persist Document entity to PostgreSQL
    const document = await this.prisma.document.create({
      data: {
        fileUrl: metadata.path,
        checksum: metadata.checksum,
        mimeType: metadata.contentType,
        uploadedBy,
        companyId: user?.tenantId || null,
        source: 'MANUAL_UPLOAD',
        status: 'UPLOADED',
      },
    });

    this.logger.log(
      `File uploaded: documentId=${document.id} checksum=${metadata.checksum}`,
      'FilesController',
    );

    return {
      fileId: document.id,
      checksum: metadata.checksum,
      status: 'UPLOADED',
    };
  }

  /**
   * GET /files/:id
   * Returns the stored file URL for a given Document ID.
   */
  @Get(':id')
  @RequirePermissions('Invoice.Read')
  async getFile(@Param('id') id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException(`Document not found: ${id}`);
    }

    return { url: document.fileUrl, status: document.status };
  }

  /**
   * GET /files/:id/metadata
   * Returns full document metadata.
   */
  @Get(':id/metadata')
  @RequirePermissions('Invoice.Read')
  async getMetadata(@Param('id') id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException(`Document not found: ${id}`);
    }

    return {
      id: document.id,
      fileUrl: document.fileUrl,
      checksum: document.checksum,
      mimeType: document.mimeType,
      uploadedBy: document.uploadedBy,
      source: document.source,
      status: document.status,
      receivedAt: document.receivedAt,
    };
  }

  /**
   * DELETE /files/:id
   * Soft-deletes a document by setting status to DUPLICATE (logical deletion marker).
   * Physical file deletion is a maintenance concern.
   */
  @Delete(':id')
  @RequirePermissions('Invoice.Delete')
  async deleteFile(@Param('id') id: string) {
    const document = await this.prisma.document.findUnique({ where: { id } });

    if (!document) {
      throw new NotFoundException(`Document not found: ${id}`);
    }

    // Soft delete — update status; physical file removal is deferred to storage GC
    await this.prisma.document.update({
      where: { id },
      data: { status: 'DUPLICATE' }, // Reuse DUPLICATE as a logical "deleted" state
    });

    return { message: 'Document soft-deleted', id };
  }
}
