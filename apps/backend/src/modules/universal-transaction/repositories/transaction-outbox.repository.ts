import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { Prisma, TransactionOutbox, OutboxStatus } from '@prisma/client';

@Injectable()
export class TransactionOutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createEvent(
    data: {
      aggregateType: string;
      aggregateId: string;
      eventType: string;
      payload: any;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<TransactionOutbox> {
    const client = tx || this.prisma;
    return client.transactionOutbox.create({
      data: {
        aggregateType: data.aggregateType,
        aggregateId: data.aggregateId,
        eventType: data.eventType,
        payload: data.payload,
        status: OutboxStatus.PENDING,
      },
    });
  }

  async claimEvents(batchSize: number = 50): Promise<TransactionOutbox[]> {
    return this.prisma.$transaction(async (tx) => {
      const events = await tx.transactionOutbox.findMany({
        where: {
          OR: [
            { status: OutboxStatus.PENDING },
            {
              status: OutboxStatus.FAILED,
              nextRetryAt: { lte: new Date() },
            },
            {
              status: OutboxStatus.FAILED,
              nextRetryAt: null,
            },
          ],
        },
        take: batchSize,
        orderBy: { createdAt: 'asc' },
      });

      if (events.length === 0) return [];

      const ids = events.map((e) => e.id);

      await tx.transactionOutbox.updateMany({
        where: { id: { in: ids } },
        data: { status: OutboxStatus.PROCESSING },
      });

      return events.map((e) => ({ ...e, status: OutboxStatus.PROCESSING }));
    });
  }

  async markProcessed(id: string): Promise<TransactionOutbox> {
    return this.prisma.transactionOutbox.update({
      where: { id },
      data: {
        status: OutboxStatus.PROCESSED,
        processedAt: new Date(),
      },
    });
  }

  async markFailed(
    id: string,
    errorMessage: string,
    currentRetryCount: number,
    maxRetries: number = 5,
  ): Promise<TransactionOutbox> {
    const nextRetryCount = currentRetryCount + 1;
    if (nextRetryCount >= maxRetries) {
      return this.prisma.transactionOutbox.update({
        where: { id },
        data: {
          status: OutboxStatus.DEAD,
          errorMessage,
          lastError: errorMessage,
          retryCount: nextRetryCount,
        },
      });
    }

    const backoffMs = Math.pow(2, nextRetryCount) * 10000;
    const nextRetryAt = new Date(Date.now() + backoffMs);

    return this.prisma.transactionOutbox.update({
      where: { id },
      data: {
        status: OutboxStatus.FAILED,
        errorMessage,
        lastError: errorMessage,
        retryCount: nextRetryCount,
        nextRetryAt,
      },
    });
  }

  async deleteOldProcessed(days: number, batchSize: number = 1000): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await this.prisma.transactionOutbox.deleteMany({
      where: {
        status: OutboxStatus.PROCESSED,
        processedAt: { lte: cutoffDate },
      },
    });

    return result.count;
  }

  async findDeadLetters(skip: number = 0, take: number = 50) {
    return this.prisma.transactionOutbox.findMany({
      where: { status: OutboxStatus.DEAD },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async replayDeadLetter(id: string): Promise<TransactionOutbox> {
    return this.prisma.transactionOutbox.update({
      where: { id, status: OutboxStatus.DEAD },
      data: {
        status: OutboxStatus.PENDING,
        retryCount: 0,
        nextRetryAt: null,
      },
    });
  }

  async replayAllDeadLetters(): Promise<number> {
    const result = await this.prisma.transactionOutbox.updateMany({
      where: { status: OutboxStatus.DEAD },
      data: {
        status: OutboxStatus.PENDING,
        retryCount: 0,
        nextRetryAt: null,
      },
    });
    return result.count;
  }

  async getDeadLetterById(id: string): Promise<TransactionOutbox | null> {
    return this.prisma.transactionOutbox.findUnique({
      where: { id, status: OutboxStatus.DEAD },
    });
  }

  async deleteDeadLetter(id: string): Promise<TransactionOutbox> {
    return this.prisma.transactionOutbox.delete({
      where: { id, status: OutboxStatus.DEAD },
    });
  }

  async rescueStrandedEvents(timeoutMinutes: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setMinutes(cutoffDate.getMinutes() - timeoutMinutes);

    const result = await this.prisma.transactionOutbox.updateMany({
      where: {
        status: OutboxStatus.PROCESSING,
        updatedAt: { lte: cutoffDate },
      },
      data: {
        status: OutboxStatus.PENDING,
      },
    });

    return result.count;
  }

}
