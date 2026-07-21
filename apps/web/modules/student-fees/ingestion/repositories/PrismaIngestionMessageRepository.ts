import { prisma } from '../../../../shared/db/prisma';

export class PrismaIngestionMessageRepository {
  /**
   * Checks if a message with the exact ID already exists for the provider.
   */
  public async existsByMessageId(provider: string, messageId: string): Promise<boolean> {
    const count = await prisma.ingestionMessage.count({
      where: {
        provider,
        messageId
      }
    });
    return count > 0;
  }

  /**
   * Checks if a message with identical semantics (same payload hash) already exists for the provider.
   */
  public async existsByPayloadHash(provider: string, payloadHash: string): Promise<boolean> {
    const count = await prisma.ingestionMessage.count({
      where: {
        provider,
        payloadHash
      }
    });
    return count > 0;
  }
}
