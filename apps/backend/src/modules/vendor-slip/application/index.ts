// application/commands/index.ts
export class UploadInvoiceCommand {
  constructor(public readonly fileUrl: string) {}
}
export class RunOCRCommand {
  constructor(public readonly documentId: string) {}
}
export class ExtractInvoiceCommand {
  constructor(
    public readonly documentId: string,
    public readonly ocrText: string,
  ) {}
}
export class MatchVendorCommand {
  constructor(public readonly candidateId: string) {}
}
export class AllocateExpenseCommand {
  constructor(public readonly matchId: string) {}
}
export class GenerateVoucherCommand {
  constructor(public readonly allocationId: string) {}
}

// application/handlers/index.ts
import { Injectable } from '@nestjs/common';
import { EventPublisher } from '../../../shared/events';
import {
  VendorMatcher,
  OCRCoordinator,
  InvoiceExtractor,
} from '../../domain/services';
import { ITransactionContext } from '../../../shared/domain/repositories';
import { IVendorMatchRepository } from '../../domain/repositories';

@Injectable()
export class MatchVendorCommandHandler {
  constructor(
    private readonly matcher: VendorMatcher,
    private readonly matchRepo: IVendorMatchRepository,
    private readonly publisher: EventPublisher,
  ) {}

  async execute(
    command: MatchVendorCommand,
    tx: ITransactionContext,
  ): Promise<void> {
    // 1. Load Candidate
    // 2. Call Matcher
    // 3. Save Match
    // 4. Publish VendorMatched integration event
    // 5. Or route to manual review if confidence is low
  }
}

// application/queries/index.ts
export class InvoiceStatusQuery {
  constructor(public readonly documentId: string) {}
}
export class VendorQuery {
  constructor(public readonly criteria: any) {}
}
export class VoucherStatusQuery {
  constructor(public readonly voucherId: string) {}
}
