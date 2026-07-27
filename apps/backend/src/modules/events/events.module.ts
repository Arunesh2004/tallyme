import { Module } from '@nestjs/common';
import { EnterpriseEventGateway } from './enterprise-event.gateway';

@Module({
  providers: [EnterpriseEventGateway],
  exports: [EnterpriseEventGateway],
})
export class EventsModule {}
