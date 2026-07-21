import { IQueue } from './IQueue';
import { BullQueueAdapter } from './BullQueueAdapter';
import { BullConnection } from './BullConnection';

export class QueueFactory {
  static createQueue<T>(name: string): IQueue<T> {
    // In a real implementation, this abstracts the creation of the underlying queue technology
    return new BullQueueAdapter<T>(name, BullConnection);
  }
}
