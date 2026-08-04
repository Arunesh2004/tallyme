import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class UploadSecurityInterceptor implements NestInterceptor {
  private readonly logger = new Logger(UploadSecurityInterceptor.name);
  private readonly MAX_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ALLOWED_MIMES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
  ];

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const file = request.file;

    if (file) {
      this.logger.log(`Scanning uploaded file: ${file.originalname}`);
      console.log('[UploadSecurityInterceptor] File metadata:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      });

      // 1. MIME Validation
      if (!this.ALLOWED_MIMES.includes(file.mimetype)) {
        this.logger.warn(`Security Block: Invalid MIME type ${file.mimetype}`);
        throw new HttpException(
          'Invalid file type. Only PDF, JPG, PNG allowed.',
          HttpStatus.UNSUPPORTED_MEDIA_TYPE,
        );
      }

      // 2. Extension Validation (Simple check)
      const ext = file.originalname.split('.').pop()?.toLowerCase();
      if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext || '')) {
        this.logger.warn(`Security Block: Invalid file extension .${ext}`);
        throw new HttpException(
          'Invalid file extension.',
          HttpStatus.UNSUPPORTED_MEDIA_TYPE,
        );
      }

      // 3. Size Limits
      if (file.size > this.MAX_SIZE) {
        this.logger.warn(`Security Block: File too large (${file.size} bytes)`);
        throw new HttpException(
          'File exceeds maximum size of 5MB.',
          HttpStatus.PAYLOAD_TOO_LARGE,
        );
      }

      // 4. Filename Sanitization
      file.originalname = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '');
    }

    return next.handle();
  }
}
