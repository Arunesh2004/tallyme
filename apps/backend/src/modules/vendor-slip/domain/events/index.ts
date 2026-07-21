// events/index.ts
import { DomainEvent, IntegrationEvent, EventMetadata } from '../../../shared/events';

export class InvoiceUploaded implements DomainEvent {
  readonly _isDomainEvent = true;
  constructor(public readonly metadata: EventMetadata, public readonly payload: any) {}
}

export class OCRCompleted implements DomainEvent {
  readonly _isDomainEvent = true;
  constructor(public readonly metadata: EventMetadata, public readonly payload: any) {}
}

export class InvoiceExtracted implements DomainEvent {
  readonly _isDomainEvent = true;
  constructor(public readonly metadata: EventMetadata, public readonly payload: any) {}
}

export class VendorMatched implements DomainEvent {
  readonly _isDomainEvent = true;
  constructor(public readonly metadata: EventMetadata, public readonly payload: any) {}
}

export class ExpenseAllocated implements DomainEvent {
  readonly _isDomainEvent = true;
  constructor(public readonly metadata: EventMetadata, public readonly payload: any) {}
}

export class VoucherGenerated implements IntegrationEvent {
  readonly _isIntegrationEvent = true;
  readonly _isDomainEvent = false;
  constructor(public readonly metadata: EventMetadata, public readonly payload: any) {}
}
