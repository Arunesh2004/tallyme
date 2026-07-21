export interface DomainEvent {
  eventId: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  payload: any;
  correlationId?: string;
  timestamp: Date;
}

export class VoucherCreatedEvent implements DomainEvent {
  public eventType = 'VoucherCreated';
  public aggregateType = 'Voucher';
  public timestamp = new Date();

  constructor(
    public eventId: string,
    public aggregateId: string,
    public payload: any,
    public correlationId?: string
  ) {}
}

export class LedgerCreatedEvent implements DomainEvent {
  public eventType = 'LedgerCreated';
  public aggregateType = 'Ledger';
  public timestamp = new Date();

  constructor(
    public eventId: string,
    public aggregateId: string,
    public payload: any,
    public correlationId?: string
  ) {}
}

export class MasterCreatedEvent implements DomainEvent {
  public eventType = 'MasterCreated';
  public aggregateType = 'Master';
  public timestamp = new Date();

  constructor(
    public eventId: string,
    public aggregateId: string,
    public payload: any,
    public correlationId?: string
  ) {}
}
