import { IQueue } from './IQueue';
import { QueueFactory } from './QueueFactory';
import { logger } from '../logging/logger';

export class QueueManager {
  private static queues = new Map<string, IQueue>();

  static register<T>(queueName: string): IQueue<T> {
    if (this.queues.has(queueName)) {
      return this.queues.get(queueName) as IQueue<T>;
    }
    const queue = QueueFactory.createQueue<T>(queueName);
    this.queues.set(queueName, queue);
    logger.info({ queueName }, 'Queue registered');
    return queue;
  }

  static get<T>(queueName: string): IQueue<T> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} is not registered.`);
    }
    return queue as IQueue<T>;
  }

  static async shutdownAll(): Promise<void> {
    logger.info('Shutting down all registered queues...');
    for (const [name, queue] of this.queues.entries()) {
      await queue.close();
      logger.debug({ queueName: name }, 'Queue closed');
    }
    this.queues.clear();
  }
}
