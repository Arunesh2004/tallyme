import { OutboxDispatcher } from './OutboxDispatcher';
import { SyncQueueService } from '../queue/SyncQueueService';
import { logger } from '../../../../shared/logging/logger';

export class SyncScheduler {
  private timer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private dispatcher: OutboxDispatcher;

  constructor() {
    this.dispatcher = new OutboxDispatcher(new SyncQueueService());
  }

  public start(intervalMs: number = 10000): void {
    if (this.timer) {
      logger.warn('SyncScheduler is already running.');
      return;
    }

    logger.info(`Starting SyncScheduler with interval ${intervalMs}ms`);
    this.timer = setInterval(() => this.run(), intervalMs);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info('SyncScheduler stopped.');
    }
  }

  private async run(): Promise<void> {
    if (this.isRunning) {
      return; // Skip if previous run is still executing
    }

    this.isRunning = true;
    try {
      await this.dispatcher.dispatchPendingEvents();
    } catch (error) {
      logger.error({ error }, 'Error in SyncScheduler run loop');
    } finally {
      this.isRunning = false;
    }
  }
}
