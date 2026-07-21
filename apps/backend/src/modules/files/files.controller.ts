// src/modules/files/files.controller.ts
import { Controller, Post, Get, Delete, Param, UseInterceptors, UploadedFile, UseGuards, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/guards/permissions.guard';
import { LocalStorageProvider } from '../../infrastructure/storage';
// In reality, PrismaService would be injected here to save the FileMetadata object to Postgres

const ALLOWED_MIMES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/tiff'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

@Controller('files')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FilesController {
  constructor(private readonly storageProvider: LocalStorageProvider) {}

  @Post('upload')
  @RequirePermissions('Invoice.Upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    if (!ALLOWED_MIMES.includes(file.mimetype)) throw new BadRequestException('Unsupported file type');
    if (file.size > MAX_SIZE) throw new BadRequestException('File exceeds maximum size limit');

    // 1. Store the physical file and calculate checksum (Path Traversal protected in provider)
    const metadata = await this.storageProvider.store(file.buffer, file.originalname, file.mimetype);

    // 2. Persist FileMetadata to Database (stubbed Prisma call)
    // await this.prisma.fileMetadata.create({ data: metadata });

    return { fileId: metadata.id, checksum: metadata.checksum, status: 'UPLOADED' };
  }

  @Get(':id')
  @RequirePermissions('Invoice.Read')
  async getFile(@Param('id') id: string) {
    return { url: `/storage/invoices/${id}` }; // Stub
  }

  @Get(':id/metadata')
  @RequirePermissions('Invoice.Read')
  async getMetadata(@Param('id') id: string) {
    return { id, status: 'UPLOADED' }; // Stub
  }

  @Delete(':id')
  @RequirePermissions('Invoice.Delete')
  async deleteFile(@Param('id') id: string) {
    return { message: 'Soft deleted' }; // Stub
  }
}
