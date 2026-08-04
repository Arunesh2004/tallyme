const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const org = await prisma.organization.create({ data: { name: 'Test Org' } });
  const company = await prisma.company.create({ data: { name: 'Test Company', organizationId: org.id } });
  console.log(`Created Company: ${company.id}`);
  
  // also inject company ID into test-pipeline.js if it hardcodes one, or update test-pipeline.js
  // Let's modify test-pipeline.js directly.
}
run();
