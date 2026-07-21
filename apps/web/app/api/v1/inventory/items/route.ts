import { NextResponse } from 'next/server';
import { prisma } from '../../../../shared/db/prisma';
import { StockItemCreated } from '../../../../modules/inventory/shared/events/InventoryEvents';
import { EventStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Ideally this lives in a dedicated PrismaStockItemRepository
    const result = await prisma.$transaction(async (tx) => {
      const stockItem = await tx.inventoryStockItem.create({
        data: {
          name: body.name,
          sku: body.sku,
          barcode: body.barcode,
          hsnCode: body.hsnCode,
          gstRate: body.gstRate,
          stockGroup: body.stockGroup,
          unit: body.unit,
          payload: body,
          organizationId: 'org_default'
        }
      });

      const event = new StockItemCreated(stockItem.id, 'StockItem', stockItem.payload, uuidv4());
      
      await tx.eventOutbox.create({
        data: {
          eventId: uuidv4(),
          aggregateId: event.aggregateId,
          aggregateType: event.aggregateType,
          eventType: event.eventType,
          payload: JSON.parse(JSON.stringify(event.payload)),
          correlationId: event.correlationId,
          status: EventStatus.PENDING,
          organizationId: 'org_default'
        }
      });

      return stockItem;
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
