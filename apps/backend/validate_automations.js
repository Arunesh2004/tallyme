const jwt = require('jsonwebtoken');

async function run() {
  const secret = 'supersecretsupersecretsupersecretsupersecret';
  const payload = {
    sub: 'admin-id',
    email: 'admin@tallyme.local',
    roles: ['admin'],
    permissions: [
      'admin:payment-parser:process',
      'admin:matching:process',
      'admin:fee-validation:process',
      'admin:voucher-builder:process',
      'admin:erp-connector:sync',
      'admin:mail:sync'
    ],
    tenantId: 'tenant-1'
  };

  const token = jwt.sign(payload, secret);
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const baseUrl = 'http://localhost:3000/api/v1';

  async function post(url, body) {
    console.log(`[POST] ${url}`);
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    const data = await res.json();
    console.log(`Response: ${res.status}`);
    console.log(data);
    console.log('-------------------------');
    return data;
  }

  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    // Seed test data
    console.log("--- Seeding Database ---");
    
    const tenantId = 'tenant-1';
    
    // Ensure company exists
    let company = await prisma.company.findUnique({ where: { id: tenantId } });
    if (!company) {
      company = await prisma.company.create({
        data: { id: tenantId, name: 'Validation Corp' }
      });
    }

    // Seed Ledgers
    const ledgerNames = ['Bank', 'Cash', 'Tuition Fees', 'Student Advance', 'Fee Collection Fees'];
    for (const name of ledgerNames) {
      const exists = await prisma.voucherLedger.findUnique({ where: { name } });
      if (!exists) {
        await prisma.voucherLedger.create({ data: { name } });
      }
    }
    
    const rand = Math.floor(Math.random() * 1000000);
    const p_id = `p_${rand}`;
    const studentId = `stu_${rand}`;
    const emailId = `msg_${rand}`;
    
    // Create an EmailDocument
    await prisma.emailDocument.create({
      data: {
        id: emailId,
        messageId: emailId,
        subject: 'Payment Received',
        sender: 'alerts@razorpay.com',
        receivedAt: new Date(),
        source: 'GMAIL',
        checksum: `checksum_${rand}`
      }
    });

    
    // Create a real PaymentCandidate (simulating payment-parser output)
    const paymentCandidate = await prisma.paymentCandidate.create({
      data: {
        id: p_id,
        gateway: 'razorpay',
        transactionId: `TXN-${rand}`,
        rawData: { amount: 8000, studentName: 'John Doe', admissionNumber: 'ADM-2026-001' }
      }
    });

    const outstandingFee = await prisma.outstandingFee.create({
      data: {
        studentId: studentId,
        amountPaid: 0,
        isPaid: false,
      }
    });

    console.log("--- Executing Vendor Slip Automation ---");
    await post(`${baseUrl}/payment-parser/process`, { emailId: `msg_${rand}` });

    console.log("--- Executing Student Fee Automation ---");
    // This will create a StudentPaymentCandidate
    await post(`${baseUrl}/student-matching/process`, { paymentCandidateId: p_id });
    
    const studentPaymentCandidate = await prisma.studentPaymentCandidate.findFirst({
      where: { paymentCandidateId: p_id }
    });
    
    if (!studentPaymentCandidate) {
      throw new Error(`StudentPaymentCandidate not found for paymentCandidateId: ${p_id}`);
    }

    // Force studentId to be our seeded student since matching logic might not set it correctly without rules
    await prisma.studentPaymentCandidate.update({
      where: { id: studentPaymentCandidate.id },
      data: { studentId: studentId, amount: 8000 }
    });

    // This will create a FeeAllocationCandidate
    await post(`${baseUrl}/fee-validation/process`, { studentPaymentCandidateId: studentPaymentCandidate.id });
    
    const feeAllocationCandidate = await prisma.feeAllocationCandidate.findFirst({
      where: { studentPaymentCandidateId: studentPaymentCandidate.id }
    });
    
    if (!feeAllocationCandidate) {
      throw new Error(`FeeAllocationCandidate not found for studentPaymentCandidateId: ${studentPaymentCandidate.id}`);
    }

    // This will create a VoucherCandidate
    await post(`${baseUrl}/voucher-builder/process`, { feeAllocationCandidateId: feeAllocationCandidate.id });
    
    const voucherCandidate = await prisma.voucherCandidate.findFirst({
      where: { companyId: company.id },
      orderBy: { id: 'desc' }
    });

    console.log("--- Validating ERP Synchronization ---");
    await post(`${baseUrl}/erp-connector/sync`, { voucherCandidateId: voucherCandidate.id });

    console.log("Validation script completed successfully.");
    
    await prisma.$disconnect();
  } catch (error) {
    console.error("Validation failed:", error);
  }
}

run();
