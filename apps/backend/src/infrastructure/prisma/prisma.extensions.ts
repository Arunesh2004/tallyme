import { PrismaClient } from '@prisma/client';

export const withExtensions = (prisma: PrismaClient) => {
  return prisma.$extends({
    query: {
      // Future Extension Points for Audit logging, Soft Delete, Tenant filtering
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Placeholder: Automatically attach correlation ID or filter by tenantId
          return query(args);
        },
      },
    },
    model: {
      $allModels: {
        // Placeholder for custom model methods like softDelete
      },
    },
  });
};

export type ExtendedPrismaClient = ReturnType<typeof withExtensions>;
