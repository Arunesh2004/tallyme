import { v4 as uuidv4 } from 'uuid';
import { DomainEvent } from '@/modules/accounting/shared/events/AccountingEvents';

export class StockItemCreated implements DomainEvent {
  public eventId: string = uuidv4();
  public timestamp: Date = new Date();

  public eventType = 'StockItemCreated';
  public occurredAt = new Date();

  constructor(
    public aggregateId: string,
    public aggregateType: string = 'StockItem',
    public payload: any,
    public correlationId?: string
  ) {}
}

export class StockGroupCreated implements DomainEvent {
  public eventId: string = uuidv4();
  public timestamp: Date = new Date();

  public eventType = 'StockGroupCreated';
  public occurredAt = new Date();

  constructor(
    public aggregateId: string,
    public aggregateType: string = 'StockGroup',
    public payload: any,
    public correlationId?: string
  ) {}
}

export class StockCategoryCreated implements DomainEvent {
  public eventId: string = uuidv4();
  public timestamp: Date = new Date();

  public eventType = 'StockCategoryCreated';
  public occurredAt = new Date();

  constructor(
    public aggregateId: string,
    public aggregateType: string = 'StockCategory',
    public payload: any,
    public correlationId?: string
  ) {}
}

export class UnitCreated implements DomainEvent {
  public eventId: string = uuidv4();
  public timestamp: Date = new Date();

  public eventType = 'UnitCreated';
  public occurredAt = new Date();

  constructor(
    public aggregateId: string,
    public aggregateType: string = 'Unit',
    public payload: any,
    public correlationId?: string
  ) {}
}

export class GodownCreated implements DomainEvent {
  public eventId: string = uuidv4();
  public timestamp: Date = new Date();

  public eventType = 'GodownCreated';
  public occurredAt = new Date();

  constructor(
    public aggregateId: string,
    public aggregateType: string = 'Godown',
    public payload: any,
    public correlationId?: string
  ) {}
}

export class PriceLevelCreated implements DomainEvent {
  public eventId: string = uuidv4();
  public timestamp: Date = new Date();

  public eventType = 'PriceLevelCreated';
  public occurredAt = new Date();

  constructor(
    public aggregateId: string,
    public aggregateType: string = 'PriceLevel',
    public payload: any,
    public correlationId?: string
  ) {}
}

export class BatchCreated implements DomainEvent {
  public eventId: string = uuidv4();
  public timestamp: Date = new Date();

  public eventType = 'BatchCreated';
  public occurredAt = new Date();

  constructor(
    public aggregateId: string,
    public aggregateType: string = 'Batch',
    public payload: any,
    public correlationId?: string
  ) {}
}

// Future ERP tracking events (Not implemented in Phase 1, but defined as requested)
export class StockItemUpdated implements DomainEvent {
  public eventId: string = uuidv4();
  public timestamp: Date = new Date();

  public eventType = 'StockItemUpdated';
  public occurredAt = new Date();
  constructor(public aggregateId: string, public aggregateType: string = 'StockItem', public payload: any, public correlationId?: string) {}
}

export class StockItemDeleted implements DomainEvent {
  public eventId: string = uuidv4();
  public timestamp: Date = new Date();

  public eventType = 'StockItemDeleted';
  public occurredAt = new Date();
  constructor(public aggregateId: string, public aggregateType: string = 'StockItem', public payload: any, public correlationId?: string) {}
}

export class StockTransferred implements DomainEvent {
  public eventId: string = uuidv4();
  public timestamp: Date = new Date();

  public eventType = 'StockTransferred';
  public occurredAt = new Date();
  constructor(public aggregateId: string, public aggregateType: string = 'StockTransfer', public payload: any, public correlationId?: string) {}
}

export class StockAdjusted implements DomainEvent {
  public eventId: string = uuidv4();
  public timestamp: Date = new Date();

  public eventType = 'StockAdjusted';
  public occurredAt = new Date();
  constructor(public aggregateId: string, public aggregateType: string = 'StockAdjustment', public payload: any, public correlationId?: string) {}
}
