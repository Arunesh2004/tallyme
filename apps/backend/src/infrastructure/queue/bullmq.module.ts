import { Global, Module } from '@nestjs/common';
import { BullMqService } from './bullmq.service';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    // Register the underlying nestjs/bullmq module for future worker decorators
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
          password: config.get<string>('redis.password'),
          db: config.get<number>('redis.db'),
          keyPrefix: config.get<string>('redis.keyPrefix') + 'bull:',
        },
      }),
    }),
  ],
  providers: [BullMqService],
  exports: [BullMqService, BullModule],
})
export class QueueModule {}
