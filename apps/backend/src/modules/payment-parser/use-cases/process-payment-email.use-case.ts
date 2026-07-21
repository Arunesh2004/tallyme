import { Injectable, Inject } from '@nestjs/common';
import { LoggerService } from '../../../core/logger/logger.service';
import { GatewayDetector } from '../services/gateway.detector';
import { ParserSelector } from '../services/parser.selector';
import { DuplicatePreCheck } from '../services/duplicate.pre-check';
import {
  PAYMENT_PARSER_REPOSITORY,
  PAYMENT_CANDIDATE_QUEUE,
} from '../constants/parser.constants';
import { IPaymentParserRepository } from '../interfaces/parser.interfaces';
import { PaymentCandidateMapper } from '../mappers/candidate.mapper';
import { IQueueService } from '../../../infrastructure/queue/queue.interfaces';
import { QUEUE_PROVIDER } from '../../../infrastructure/queue/queue.constants';

@Injectable()
export class ProcessPaymentEmailUseCase {
  constructor(
    private readonly detector: GatewayDetector,
    private readonly selector: ParserSelector,
    private readonly duplicateCheck: DuplicatePreCheck,
    @Inject(PAYMENT_PARSER_REPOSITORY)
    private readonly repository: IPaymentParserRepository,
    @Inject(QUEUE_PROVIDER) private readonly queue: IQueueService,
    private readonly logger: LoggerService,
  ) {}

  async execute(email: any): Promise<void> {
    this.logger.debug(
      `Processing email ${email.id} for payment info`,
      'ProcessPaymentEmailUseCase',
    );

    const gatewayName = this.detector.detect(email);
    const parser = this.selector.select(gatewayName);

    let candidateDomain;
    let isSuccess = false;

    try {
      candidateDomain = await parser.parse(email);
      isSuccess = true;
    } catch (error) {
      this.logger.error(
        `Parser failed for email ${email.id}`,
        (error as Error).stack,
        'ProcessPaymentEmailUseCase',
      );
      throw error; // Let outer scope handle it
    }

    const isDuplicate =
      await this.duplicateCheck.isPotentialDuplicate(candidateDomain);

    if (isDuplicate) {
      this.logger.warn(
        `Potential duplicate candidate detected for transaction ${candidateDomain.transactionId}`,
        'ProcessPaymentEmailUseCase',
      );
    }

    const dbPayload = PaymentCandidateMapper.toPrisma({
      ...candidateDomain,
      isDuplicate,
    });

    const attemptData = {
      emailId: email.id,
      parserUsed: parser.identifier,
      success: isSuccess,
      confidenceScore: candidateDomain.confidence,
    };

    const saved = await this.repository.saveParsingResult(
      dbPayload,
      attemptData,
    );

    if (isSuccess && candidateDomain.confidence > 0 && !isDuplicate) {
      await this.queue.addJob(PAYMENT_CANDIDATE_QUEUE, 'match-student', {
        candidateId: saved.id,
      });
    }
  }
}
