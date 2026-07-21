import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export type TransactionClient = Omit<
  PrismaService['client'],
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class TransactionManager {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Executes a callback within a Prisma transaction block.
   * Ensures atomicity and rollback on exceptions.
   */
  async runInTransaction<T>(
    callback: (tx: TransactionClient) => Promise<T>,
    timeoutMs = 10000
  ): Promise<T> {
    return await this.prismaService.client.$transaction(
      async (tx: TransactionClient) => {
        return await callback(tx);
      },
      {
        maxWait: timeoutMs,
        timeout: timeoutMs,
      }
    );
  }
}
