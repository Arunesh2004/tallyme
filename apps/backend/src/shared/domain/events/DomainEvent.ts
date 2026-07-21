import { UUID, CorrelationId } from '../../types';
import { IIdGenerator, IClock } from '../../contracts';

export abstract class DomainEvent {
  public readonly eventId: UUID;
  public readonly occurredOn: Date;
  public readonly correlationId?: CorrelationId;
  public readonly aggregateId: string;
  public readonly aggregateType: string;
  public readonly version: number;

  constructor(
    idGenerator: IIdGenerator,
    clock: IClock,
    aggregateId: string,
    aggregateType: string,
    version: number,
    correlationId?: CorrelationId
  ) {
    this.eventId = idGenerator.generateId() as UUID;
    this.occurredOn = clock.now();
    this.aggregateId = aggregateId;
    this.aggregateType = aggregateType;
    this.version = version;
    this.correlationId = correlationId;
  }

  abstract getEventName(): string;
}
