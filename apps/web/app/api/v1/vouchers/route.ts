import { NextRequest, NextResponse } from 'next/server';
import { VoucherService } from '../../../../modules/accounting/voucher/services/VoucherService';
import { PrismaVoucherRepository } from '../../../../modules/accounting/voucher/repositories/PrismaVoucherRepository';

function createVoucherService() {
  const repository = new PrismaVoucherRepository();
  return new VoucherService(repository);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const voucherService = createVoucherService();
    const result = await voucherService.createVoucher(body);

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
    message: 'GET /api/v1/vouchers is a placeholder for future implementation.'
  });
}
