import { NextRequest, NextResponse } from 'next/server';

// eslint-disable-next-line no-unused-vars
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({
    success: true,
    message: `GET /api/v1/vouchers/${id} is a placeholder for future implementation.`
  });
}

// eslint-disable-next-line no-unused-vars
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({
    success: true,
    message: `DELETE /api/v1/vouchers/${id} is a placeholder for future implementation.`
  });
}
