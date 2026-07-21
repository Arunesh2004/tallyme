// application/commands/index.ts
export class ParsePaymentEmailCommand { constructor(public readonly emailRawId: string) {} }
export class MatchStudentCommand { constructor(public readonly candidateId: string) {} }
export class AllocateFeeCommand { constructor(public readonly paymentId: string) {} }
export class GenerateVoucherCommand { constructor(public readonly allocationId: string) {} }

// application/handlers/index.ts
import { Injectable } from '@nestjs/common';
import { EventPublisher } from '../../../shared/events';
import { StudentMatcher, FeeAllocator, VoucherGenerator } from '../../domain/services';
import { FeeValidationPolicy } from '../../domain/services'; // Assumed exported in same index for stub
import { ITransactionContext } from '../../../shared/domain/repositories';

@Injectable()
export class MatchStudentCommandHandler {
  constructor(
    private readonly matcher: StudentMatcher,
    private readonly publisher: EventPublisher
  ) {}

  async execute(command: MatchStudentCommand, tx: ITransactionContext): Promise<void> {
    // 1. Load Candidate
    // 2. Call Matcher
    // 3. If match -> Save -> Publish StudentMatched
    // 4. If fail -> Route to Manual Review
  }
}

// application/queries/index.ts
export class PaymentStatusQuery { constructor(public readonly transactionId: string) {} }
export class StudentOutstandingFeeQuery { constructor(public readonly studentId: string) {} }
