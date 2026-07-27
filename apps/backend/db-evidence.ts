import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['error'],
});

async function main() {
  console.log('--- STARTING DATABASE CERTIFICATION EVIDENCE COLLECTION ---');
  
  // 1. Connection check
  console.log('STEP 4: VERIFY PRISMA CONNECTION');
  try {
    const rawResult = await prisma.$queryRaw`SELECT 1 as result`;
    console.log(JSON.stringify(rawResult, null, 2));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }

  // 4. Verify CRUD operations
  console.log('STEP 5: VERIFY CRUD');
  const role = await prisma.role.create({
    data: { name: 'Admin_Test_' + Date.now() }
  });
  console.log('Role Created:');
  console.log(JSON.stringify(role, null, 2));

  const user = await prisma.user.create({
    data: {
      email: 'test_crud_' + Date.now() + '@example.com',
      passwordHash: 'hashed123',
      roleId: role.id
    }
  });
  console.log('User Created:');
  console.log(JSON.stringify(user, null, 2));
  
  const company1 = await prisma.company.create({
    data: {
      name: 'Company A'
    }
  });
  console.log('Company A Created:');
  console.log(JSON.stringify(company1, null, 2));
  
  const company2 = await prisma.company.create({
    data: {
      name: 'Company B'
    }
  });
  console.log('Company B Created:');
  console.log(JSON.stringify(company2, null, 2));

  const vendor = await prisma.vendor.create({
    data: {
      companyId: company1.id,
      name: 'Vendor A',
      vendorCode: 'VND_001_' + Date.now(),
    }
  });
  console.log('Vendor Created:');
  console.log(JSON.stringify(vendor, null, 2));
  
  const student = await prisma.student.create({
    data: {
      companyId: company1.id,
      firstName: 'Student A',
      enrollmentNo: 'ENR-001_' + Date.now(),
    }
  });
  console.log('Student Created:');
  console.log(JSON.stringify(student, null, 2));
  
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
  console.log('Document Created:');
  console.log(JSON.stringify(invoice, null, 2));

  // Query back
  console.log('Query Back Result:');
  const fetchedUser = await prisma.user.findUnique({ where: { id: user.id } });
  console.log(JSON.stringify(fetchedUser, null, 2));
  
  // 5. Transactions
  console.log('STEP 7: VERIFY TRANSACTION ROLLBACK');
  const txEmail = 'tx_rollback_' + Date.now() + '@example.com';
  console.log('Before TX:');
  const beforeTx = await prisma.user.findUnique({ where: { email: txEmail } });
  console.log(JSON.stringify(beforeTx, null, 2));

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: { email: txEmail, passwordHash: 'tx', roleId: role.id }
      });
      console.log('Inside TX, record inserted, now forcing error...');
      throw new Error('Forced Rollback Exception');
    });
  } catch (err: any) {
    console.log('Transaction Error Caught:');
    console.log(err.message);
  }
  
  console.log('After Rollback:');
  const afterTx = await prisma.user.findUnique({ where: { email: txEmail } });
  console.log(JSON.stringify(afterTx, null, 2));

  // 6. Foreign Key Constraints
  console.log('STEP 6: VERIFY FOREIGN KEYS');
  try {
    await prisma.user.create({
      data: {
        email: 'invalid_role@example.com',
        passwordHash: '123',
        roleId: '00000000-0000-0000-0000-000000000000',
      }
    });
  } catch (err: any) {
    console.log('FK Error Details:');
    console.log(err.message);
  }

  // 7. Tenant Isolation
  console.log('STEP 8: VERIFY TENANT ISOLATION');
  const cmp1Vendors = await prisma.vendor.findMany({ where: { companyId: company1.id } });
  console.log('Company A Result:');
  console.log(JSON.stringify(cmp1Vendors, null, 2));

  const cmp2Vendors = await prisma.vendor.findMany({ where: { companyId: company2.id } });
  console.log('Company B Result:');
  console.log(JSON.stringify(cmp2Vendors, null, 2));
  
  // 8. Basic Query Timings
  console.log('STEP 9: VERIFY PERFORMANCE');
  console.log('Timings measured using performance.now() wrapping the await prisma... calls.');
  const t0 = performance.now();
  const tUser = await prisma.user.create({
    data: { email: 'timing_' + Date.now() + '@example.com', passwordHash: 'tx', roleId: role.id }
  });
  const t1 = performance.now();
  console.log(`Insert:\n${(t1 - t0).toFixed(2)} ms`);
  
  const t2 = performance.now();
  await prisma.user.findUnique({ where: { id: tUser.id } });
  const t3 = performance.now();
  console.log(`Select:\n${(t3 - t2).toFixed(2)} ms`);
  
  const t4 = performance.now();
  await prisma.user.update({ where: { id: tUser.id }, data: { isActive: false } });
  const t5 = performance.now();
  console.log(`Update:\n${(t5 - t4).toFixed(2)} ms`);

  const t6 = performance.now();
  await prisma.user.delete({ where: { id: tUser.id } });
  const t7 = performance.now();
  console.log(`Delete:\n${(t7 - t6).toFixed(2)} ms`);

  // Cleanup
  await prisma.document.deleteMany({});
  await prisma.vendor.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.company.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.role.deleteMany({});

  console.log('--- DB EVIDENCE COLLECTION COMPLETE ---');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});
