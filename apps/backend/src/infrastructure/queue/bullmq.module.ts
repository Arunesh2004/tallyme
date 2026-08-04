import { Global, Module } from '@nestjs/common';
import { QUEUE_PROVIDER } from './queue.constants';
import { BullMqService } from './bullmq.service';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { BullMQModule } from './bullmq/index';

@Global()
@Module({
  imports: [
    BullMQModule,
    // Register the underlying nestjs/bullmq module for future worker decorators
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
          password: config.get<string>('redis.password'),
          db: config.get<number>('redis.db'),
          family: 4,
        },
        prefix: config.get<string>('redis.keyPrefix') + 'bull',
      }),
    }),
  ],
  providers: [
    BullMqService,
    {
      provide: QUEUE_PROVIDER,
      useExisting: BullMqService,
    },
  ],
  exports: [BullMqService, QUEUE_PROVIDER, BullModule],
})
export class QueueModule {}
