const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const migrations = await prisma.$queryRawUnsafe('SELECT migration_name FROM _prisma_migrations');
  console.log(migrations.map(m => m.migration_name).join('\n'));
}

main().catch(console.error).finally(() => prisma.$disconnect());
