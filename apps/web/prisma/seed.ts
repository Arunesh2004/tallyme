import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding default system data...');

  // Note: Since everything is strictly tenant-scoped, we cannot seed
  // global roles without an Organization. In a real system, the signup
  // flow handles the default tenant seed. This seed script is designed
  // to be invoked programmatically when an Organization is created.
  
  // E.g., `seedDefaultRolesForOrganization(orgId: string)`
  
  console.log('Seed framework established. Awaiting tenant creation workflows.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
