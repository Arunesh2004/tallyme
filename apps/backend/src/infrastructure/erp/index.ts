// module/ERPModule.ts
import { Module } from '@nestjs/common';
import { TallyConnector } from './adapters';
import { ERPHttpClient, ERPFailureClassifier } from './client';
import { XMLBuilder, XMLParser, VoucherMapper } from './serialization';
import { ERPIdempotencyService } from './adapters'; // Bundled in adapters.ts
import { SyncTracker } from './adapters';

@Module({
  providers: [
    { provide: 'ERPConnector', useClass: TallyConnector },
    ERPHttpClient,
    ERPFailureClassifier,
    XMLBuilder,
    XMLParser,
    VoucherMapper,
    ERPIdempotencyService,
    SyncTracker,
  ],
  exports: ['ERPConnector'],
})
export class ERPModule {}

// index.ts
export * from './contracts/index';
export * from './adapters';
export * from './client';
export * from './serialization';
export * from './module/ERPModule';
