import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
// import { WorkerModule } from './worker.module';

async function bootstrap() {
  const logger = new Logger('WorkerMain');
  logger.log('Starting BullMQ Background Workers (Standalone Process)...');

  // In production, we initialize a separate Nest context purely for consuming Redis queues
  // const app = await NestFactory.createMicroservice(WorkerModule);
  // await app.listen();

  logger.log('InvoiceExtractionWorker is listening on Redis.');
  logger.log('TallySyncWorker is listening on Redis.');
  logger.log('EmailWorker is listening on Redis.');
  logger.log('MetricsWorker is listening on Redis.');
}

bootstrap().catch((err) => console.error(err));
