import { NextRequest, NextResponse } from 'next/server';
import { MasterService } from '../../../../../modules/accounting/masters/services/MasterService';
import { PrismaMasterRepository } from '../../../../../modules/accounting/masters/repositories/PrismaMasterRepository';
import { MasterType } from '../../../../../modules/accounting/masters/entities/MasterType';

function createMasterService() {
  const repository = new PrismaMasterRepository();
  return new MasterService(repository);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  try {
    const { type } = await params;
    const body = await req.json();
    
    // Inject the masterType from the URL into the DTO if it's not present
    const dto = { ...body, masterType: type as MasterType };

    const masterService = createMasterService();
    const result = await masterService.createMaster(dto);

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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  try {
    const { type } = await params;
    const masterType = type as MasterType;

    const masterService = createMasterService();
    const result = await masterService.readMasters(masterType);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Internal Server Error', errors: [error.message] },
      { status: 500 }
    );
  }
}
