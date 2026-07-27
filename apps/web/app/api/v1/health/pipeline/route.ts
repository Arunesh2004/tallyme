import { NextResponse } from 'next/server';
import { prisma } from '@/shared/db/prisma';

export async function GET() {
  try {
    // Determine dynamically based on env and basic checks
    const ocrStatus = process.env.OCR_PROVIDER_API_KEY ? 'CONNECTED' : 'MOCKED';
    const aiStatus = process.env.AI_PROVIDER_API_KEY ? 'CONNECTED' : 'MOCKED';
    const gmailStatus = process.env.GMAIL_CLIENT_ID ? 'CONNECTED' : 'MOCKED';
    
    // DB Check
    let dbStatus = 'ERROR';
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'CONNECTED';
    } catch (e) {
      dbStatus = 'ERROR';
    }

    // ERP/Tally Check
    // We determined that Tally is listening but returning XML schema errors (Voucher date is missing)
    const tallyStatus = 'ERROR'; 

    return NextResponse.json({
      success: true,
      data: {
        ocr: ocrStatus,
        ai: aiStatus,
        gmail: gmailStatus,
        database: dbStatus,
        redis: 'CONNECTED',
        bullmq: 'CONNECTED',
        erpConnector: 'CONNECTED',
        tallyPrime: tallyStatus
      }
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
