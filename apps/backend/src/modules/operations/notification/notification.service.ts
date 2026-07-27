import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

export type NotificationType =
  | 'APPROVAL_REQUIRED'
  | 'SYNC_FAILED'
  | 'MIGRATION_COMPLETED'
  | 'ROLLBACK_FAILED'
  | 'LOW_CONFIDENCE_EXTRACTION';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async notify(
    type: NotificationType,
    message: string,
    entityId?: string,
    userId?: string,
  ) {
    this.logger.log(`Creating notification: [${type}] ${message}`);

    return this.prisma.notification.create({
      data: {
        type,
        message,
        entityId,
        userId,
        status: 'UNREAD',
      },
    });
  }

  async getUnread(userId?: string) {
    return this.prisma.notification.findMany({
      where: {
        status: 'UNREAD',
        ...(userId ? { userId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(notificationId: string) {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { status: 'READ' },
    });
  }
}
