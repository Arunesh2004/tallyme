import { NextResponse } from 'next/server';
import { prisma } from '@/shared/db/prisma';

export async function GET() {
  try {
    const transactions = await prisma.feeTransaction.findMany({
      take: 30,
      orderBy: { paymentDate: 'desc' },
      include: {
        student: true,
        allocations: {
          include: {
            feeHead: true
          }
        }
      }
    });

    if (transactions.length === 0) {
      // Mocking 4 transactions as requested by user if DB is empty
      return NextResponse.json({
        success: true,
        data: [
          {
            id: 'TXN-001',
            student: { studentName: 'Aarav Kumar', admissionNumber: 'REG-2024-001', class: '10th', section: 'A' },
            receiptNumber: 'RCPT-1001',
            amount: 45000,
            paymentMode: 'NEFT',
            reference: 'UTR-1002993848',
            status: 'COMPLETED',
            syncStatus: 'SYNCED',
            paymentDate: new Date('2026-07-21T10:30:00Z'),
            allocations: [{ feeHead: { name: 'Tuition Fee' }, amount: 45000 }]
          },
          {
            id: 'TXN-002',
            student: { studentName: 'Riya Singh', admissionNumber: 'REG-2024-055', class: '9th', section: 'B' },
            receiptNumber: 'RCPT-1002',
            amount: 40000,
            paymentMode: 'CHEQUE',
            reference: 'CHQ-993821',
            status: 'PARTIAL_MATCH',
            syncStatus: 'PENDING',
            paymentDate: new Date('2026-07-21T14:15:00Z'),
            allocations: [{ feeHead: { name: 'Tuition Fee' }, amount: 40000 }]
          },
          {
            id: 'TXN-003',
            student: null,
            receiptNumber: 'RCPT-1003',
            amount: 50000,
            paymentMode: 'NEFT',
            reference: 'NEFT-000192',
            status: 'UNMATCHED',
            syncStatus: 'FAILED',
            transactionDate: new Date('2026-07-20T09:45:00Z'),
            allocations: []
          },
          {
            id: 'TXN-004',
            student: { studentName: 'Vikram Mehta', admissionNumber: 'REG-2023-112', class: '11th', section: 'Science' },
            receiptNumber: 'RCPT-1004',
            amount: 48000, // Overpayment
            paymentMode: 'IMPS',
            reference: 'IMPS-44321',
            status: 'OVERPAYMENT',
            syncStatus: 'PENDING',
            transactionDate: new Date('2026-07-19T11:20:00Z'),
            allocations: [{ feeHead: { name: 'Tuition Fee' }, amount: 45000 }, { feeHead: { name: 'Advance Fee' }, amount: 3000 }]
          }
        ]
      });
    }

    return NextResponse.json({
      success: true,
      data: transactions
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch transactions', errors: [error.message] },
      { status: 500 }
    );
  }
}
