const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const candidateId = '26886192';
  console.log('Fetching invoice candidate:', candidateId);
  const ic = await prisma.invoiceCandidate.findUnique({
    where: { id: candidateId },
    include: {
      voucherCandidate: {
        include: { erpSyncJob: true }
      }
    }
  });

  if (!ic) {
    console.log('Invoice not found!');
    return;
  }

  console.log('Current state:');
  console.log('Status:', ic.status);
  console.log('VendorMatchDecision:', ic.vendorMatchDecision);
  
  if (ic.voucherCandidate) {
    console.log('VoucherCandidate exists:', ic.voucherCandidate.id);
    if (ic.voucherCandidate.erpSyncJob) {
      console.log('ERPSyncJob exists:', ic.voucherCandidate.erpSyncJob.id);
      console.log('Job status:', ic.voucherCandidate.erpSyncJob.status);
      
      // Reset job to PENDING
      await prisma.eRPSyncJob.update({
        where: { id: ic.voucherCandidate.erpSyncJob.id },
        data: {
          status: 'PENDING',
          attempts: 0,
          transportStatus: null,
          lastResponse: null
        }
      });
      console.log('Reset ERPSyncJob to PENDING for E2E testing.');
    } else {
      console.log('No ERPSyncJob found.');
    }
  } else {
    console.log('No VoucherCandidate found.');
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
