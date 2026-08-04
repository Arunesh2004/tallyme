import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('--- STARTING APPROVAL TRACE ---');
  
  // Login to get token
  const csrfRes = await axios.get('http://localhost:3001/api/v1/auth/csrf');
  const cookies = csrfRes.headers['set-cookie'];
  const loginRes = await axios.post('http://localhost:3001/api/v1/auth/login', {
    email: 'admin@test.com',
    password: 'password123'
  }, { headers: { 'X-CSRF-Token': csrfRes.data.csrfToken, 'Cookie': cookies ? cookies.join(';') : '' } });
  
  const token = loginRes.data.accessToken;
  const headers = {
    'X-CSRF-Token': csrfRes.data.csrfToken,
    'Cookie': cookies ? cookies.join(';') : '',
    'Authorization': `Bearer ${token}`
  };

  // Fetch pending review queue
  const queueRes = await axios.get('http://localhost:3001/api/v1/review/vendor', { headers });
  const pending = queueRes.data.data;
  console.log(`Found ${pending.length} pending reviews`);

  if (pending.length === 0) {
    console.log('No pending reviews found. Cannot trace approval.');
    return;
  }

  const invoice = pending[0];
  console.log('Invoice from Queue:', JSON.stringify(invoice, null, 2));

  const vendorBranchId = invoice.suggestedVendor?.id || 'unknown';

  // FIX: Align company IDs for stranded test data
  if (vendorBranchId !== 'unknown') {
    const branch = await prisma.vendorBranch.findUnique({ where: { id: vendorBranchId } });
    if (branch) {
      await prisma.document.update({
        where: { id: invoice.documentId },
        data: { companyId: branch.companyId }
      });
      console.log(`Aligned Document Company ID to ${branch.companyId}`);
    }
  }

  const payload = {
    invoiceCandidateId: invoice.id || invoice.invoiceCandidateId,
    vendorBranchId,
    comment: 'Validating manual review fix'
  };

  console.log('Sending Approval Payload:', payload);
  try {
    const approveRes = await axios.post('http://localhost:3001/api/v1/vmms/review/approve', payload, { headers });
    console.log('Approve Response:', approveRes.data);
  } catch (err: any) {
    console.error('Approve Error:', err.response?.status, JSON.stringify(err.response?.data, null, 2));
  }

  console.log('Polling for Voucher...');
  for(let i=0; i<5; i++) {
    await delay(2000);
    const voucher = await prisma.voucherCandidate.findFirst({
        where: { metadata: { path: ['invoiceCandidateId'], equals: invoice.id } },
        include: { erpSyncJob: true }
    });
    if (voucher) {
        console.log('VoucherCandidate created:', voucher.id);
        console.log('ERP Sync Job created:', (voucher as any).erpSyncJob?.id);
        break;
    }
  }
}

run().catch(console.error);
