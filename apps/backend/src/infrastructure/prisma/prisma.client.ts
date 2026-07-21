import { PrismaClient } from '@prisma/client';

/**
 * Singleton instance of the raw Prisma Client.
 * Not meant to be used directly by business modules.
 */
let prismaInstance: PrismaClient | null = null;

export const getPrismaClient = (databaseUrl: string): PrismaClient => {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      datasourceUrl: databaseUrl,
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
    });
  }
  return prismaInstance;
};
