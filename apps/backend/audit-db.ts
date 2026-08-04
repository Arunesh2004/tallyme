import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function run() {
  const report: any = { timestamp: new Date() };

  try {
    // 1. Check duplicates
    const voucherCounts = await prisma.voucherCandidate.groupBy({
      by: ['voucherNumber'],
      _count: { id: true },
      having: { id: { _count: { gt: 1 } } }
    });
    report.duplicateVoucherNumbers = voucherCounts;

    // 2. Check missing audit data
    const jobsWithoutXml = await prisma.eRPSyncJob.count({
      where: { requestXml: null }
    });
    report.jobsMissingRequestXml = jobsWithoutXml;

    const allInvoices = await prisma.invoiceCandidate.findMany({
      take: 10,
      orderBy: { id: 'desc' }
    });
    report.recentInvoices = allInvoices;

    const allVouchers = await prisma.voucherCandidate.findMany({
      take: 10,
      orderBy: { id: 'desc' },
      include: {
        erpSyncJob: true
      }
    });
    report.recentVouchers = allVouchers;

  } catch (err: any) {
    report.error = err.message;
  }

  fs.writeFileSync('db-audit-results.json', JSON.stringify(report, null, 2));
  console.log('DB Audit complete');
  await prisma.$disconnect();
}

run().catch(console.error);
