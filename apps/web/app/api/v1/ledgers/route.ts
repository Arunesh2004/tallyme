import { NextRequest, NextResponse } from 'next/server';
import { LedgerService } from '../../../../modules/accounting/ledger/services/LedgerService';
import { PrismaLedgerRepository } from '../../../../modules/accounting/ledger/repositories/PrismaLedgerRepository';

function createLedgerService() {
  const repository = new PrismaLedgerRepository();
  return new LedgerService(repository);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const ledgerService = createLedgerService();
    const result = await ledgerService.createLedger(body);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Internal Server Error', errors: [error.message] },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'GET /api/v1/ledgers is a placeholder for future implementation.'
  });
}
