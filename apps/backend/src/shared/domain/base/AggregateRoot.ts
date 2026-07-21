import { BaseEntity } from './BaseEntity';
import { DomainEvent } from '../events/DomainEvent';
import { IClock } from '../../contracts';

export abstract class AggregateRoot<TId> extends BaseEntity<TId> {
  private _domainEvents: DomainEvent[] = [];

  protected constructor(id: TId, clock: IClock) {
    super(id, clock);
  }

  get domainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  protected addDomainEvent(domainEvent: DomainEvent): void {
    this._domainEvents.push(domainEvent);
  }

  public clearDomainEvents(): void {
    this._domainEvents = [];
  }
}
