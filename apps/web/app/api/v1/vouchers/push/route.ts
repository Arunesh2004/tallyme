import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/shared/db/prisma';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const { voucherId } = await req.json();

    if (!voucherId) {
      return NextResponse.json({ error: 'voucherId is required' }, { status: 400 });
    }

    const voucher = await prisma.accountingVoucher.findUnique({
      where: { id: voucherId }
    });

    if (!voucher) {
      return NextResponse.json({ error: 'Voucher not found' }, { status: 404 });
    }

    // 1. Update Voucher Status to QUEUED
    await prisma.accountingVoucher.update({
      where: { id: voucherId },
      data: {
        syncStatus: 'QUEUED',
        queuedAt: new Date()
      }
    });

    // 2. Add an Event to EventOutbox so that BullMQ / ERP Connector picks it up
    await prisma.eventOutbox.create({
      data: {
        id: uuidv4(),
        eventId: uuidv4(),
        aggregateId: voucherId,
        aggregateType: 'AccountingVoucher',
        eventType: 'VoucherSyncRequested',
        payload: { voucherId: voucherId },
        correlationId: voucher.correlationId || uuidv4(),
        status: 'PENDING',
        organizationId: voucher.organizationId
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Voucher queued for ERP synchronization'
    });

  } catch (error: any) {
    console.error('Push Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error', errors: [error.message] },
      { status: 500 }
    );
  }
}
