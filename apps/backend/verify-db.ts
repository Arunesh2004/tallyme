import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error'],
});

async function main() {
  console.log('--- STARTING DATABASE CERTIFICATION ---');
  
  // 1. Connection check
  console.log('[1] Verifying connection...');
  await prisma.$queryRaw`SELECT 1`;
  console.log('  -> Connection SUCCESS');

  // Create Role first
  const role = await prisma.role.create({
    data: { name: 'Admin_Test_' + Date.now() }
  });

  // 4. Verify CRUD operations
  console.log('[4] Verifying CRUD operations...');
  const user = await prisma.user.create({
    data: {
      email: 'test_crud_' + Date.now() + '@example.com',
      passwordHash: 'hashed123',
      roleId: role.id
    }
  });
  
  const company1 = await prisma.company.create({
    data: {
      name: 'Company A'
    }
  });
  
  const company2 = await prisma.company.create({
    data: {
      name: 'Company B'
    }
  });

  const vendor = await prisma.vendor.create({
    data: {
      companyId: company1.id,
      name: 'Vendor A',
      vendorCode: 'VND_001_' + Date.now(),
    }
  });
  
  const student = await prisma.student.create({
    data: {
      companyId: company1.id,
      firstName: 'Student A',
      enrollmentNo: 'ENR-001_' + Date.now(),
    }
  });
  
  const invoice = await prisma.document.create({
    data: {
      companyId: company1.id,
      uploadedBy: user.id,
      fileUrl: 'http://example.com/invoice.pdf',
      checksum: '12345',
      mimeType: 'application/pdf',
      source: 'upload',
      status: 'UPLOADED',
    }
  });

  console.log('  -> Create SUCCESS');
  
  // 5. Transactions
  console.log('[5] Verifying Transactions...');
  let rollbackSuccess = false;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: { email: 'tx1@example.com', passwordHash: 'tx', roleId: role.id }
      });
      throw new Error('Rollback Error');
    });
  } catch (err: any) {
    if (err.message === 'Rollback Error') {
      rollbackSuccess = true;
    }
  }
  
  const txUser = await prisma.user.findUnique({ where: { email: 'tx1@example.com' } });
  if (!txUser && rollbackSuccess) {
    console.log('  -> Rollback SUCCESS');
  } else {
    console.log('  -> Rollback FAILED');
  }
  
  await prisma.$transaction(async (tx) => {
    await tx.user.create({
      data: { email: 'tx2@example.com', passwordHash: 'tx', roleId: role.id }
    });
  });
  const txUser2 = await prisma.user.findUnique({ where: { email: 'tx2@example.com' } });
  if (txUser2) {
    console.log('  -> Commit SUCCESS');
  } else {
    console.log('  -> Commit FAILED');
  }

  // 6. Foreign Key Constraints
  console.log('[6] Verifying FK Constraints...');
  try {
    await prisma.user.create({
      data: {
        email: 'invalid_role@example.com',
        passwordHash: '123',
        roleId: 'invalid-role-id',
      }
    });
    console.log('  -> FK constraint FAILED (Allowed invalid insert)');
  } catch (err) {
    console.log('  -> FK constraint SUCCESS (Blocked invalid insert)');
  }

  // 7. Tenant Isolation
  console.log('[7] Verifying Tenant Isolation...');
  const cmp1Vendors = await prisma.vendor.findMany({ where: { companyId: company1.id } });
  const cmp2Vendors = await prisma.vendor.findMany({ where: { companyId: company2.id } });
  if (cmp1Vendors.length === 1 && cmp2Vendors.length === 0) {
    console.log('  -> Tenant Isolation SUCCESS');
  } else {
    console.log('  -> Tenant Isolation FAILED');
  }
  
  // 8. Basic Query Timings
  console.log('[8] Measuring Timings...');
  const t0 = performance.now();
  const tUser = await prisma.user.create({
    data: { email: 'timing_' + Date.now() + '@example.com', passwordHash: 'tx', roleId: role.id }
  });
  const t1 = performance.now();
  console.log(`  -> Insert: ${(t1 - t0).toFixed(2)}ms`);
  
  const t2 = performance.now();
  await prisma.user.findUnique({ where: { id: tUser.id } });
  const t3 = performance.now();
  console.log(`  -> Select: ${(t3 - t2).toFixed(2)}ms`);
  
  const t4 = performance.now();
  await prisma.user.update({ where: { id: tUser.id }, data: { isActive: false } });
  const t5 = performance.now();
  console.log(`  -> Update: ${(t5 - t4).toFixed(2)}ms`);

  // Cleanup
  await prisma.document.deleteMany({});
  await prisma.vendor.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.company.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.role.deleteMany({});

  console.log('--- DB TEST COMPLETE ---');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});
