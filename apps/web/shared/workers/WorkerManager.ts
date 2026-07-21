import { IWorker } from './IWorker';
import { logger } from '../logging/logger';

export class WorkerManager {
  private static workers = new Map<string, IWorker>();

  static register(worker: IWorker): void {
    if (this.workers.has(worker.name)) {
      throw new Error(`Worker with name ${worker.name} is already registered.`);
    }
    this.workers.set(worker.name, worker);
    logger.info({ worker: worker.name }, 'Worker registered in manager');
  }

  static get(workerName: string): IWorker {
    const worker = this.workers.get(workerName);
    if (!worker) {
      throw new Error(`Worker ${workerName} not found.`);
    }
    return worker;
  }

  static async startAll(): Promise<void> {
    logger.info('Starting all registered workers...');
    const promises = Array.from(this.workers.values()).map(w => w.start());
    await Promise.allSettled(promises);
  }

  static async shutdownAll(): Promise<void> {
    logger.info('Initiating graceful shutdown for all workers...');
    const promises = Array.from(this.workers.values()).map(w => w.shutdown());
    await Promise.allSettled(promises);
    logger.info('All workers shut down successfully.');
  }
}
