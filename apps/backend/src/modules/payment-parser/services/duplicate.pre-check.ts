import { Injectable, Inject } from '@nestjs/common';
import { IPaymentParserRepository } from '../interfaces/parser.interfaces';
import { PAYMENT_PARSER_REPOSITORY } from '../constants/parser.constants';

@Injectable()
export class DuplicatePreCheck {
  constructor(
    @Inject(PAYMENT_PARSER_REPOSITORY)
    private readonly repository: IPaymentParserRepository,
  ) {}

  async isPotentialDuplicate(candidate: any): Promise<boolean> {
    const criteria: any = {
      gateway: candidate.gateway,
      amount: candidate.amount,
    };

    if (candidate.transactionId)
      criteria.transactionId = candidate.transactionId;
    else if (candidate.utr) criteria.utr = candidate.utr;
    else if (candidate.referenceNumber)
      criteria.referenceNumber = candidate.referenceNumber;
    else return false; // Not enough info to definitively check for duplicate

    const similar = await this.repository.findSimilarCandidates(criteria);
    return similar.length > 0;
  }
}
