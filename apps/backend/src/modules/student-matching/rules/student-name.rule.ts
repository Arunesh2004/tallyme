import { Injectable, Inject } from '@nestjs/common';
import { BaseMatchingRule } from './base.rule';
import { RuleEvaluationResult } from '../interfaces/matching.interfaces';
import {
  IStudentRepository,
  STUDENT_REPOSITORY,
} from '../../student/interfaces/student.repository.interface';

@Injectable()
export class StudentNameRule extends BaseMatchingRule {
  name = 'StudentNameRule';
  weight = 20;

  constructor(
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepo: IStudentRepository,
  ) {
    super();
  }

  async evaluate(paymentCandidate: any): Promise<RuleEvaluationResult> {
    if (!paymentCandidate.studentName) {
      return { matchedStudentIds: [], score: 0, ruleName: this.name };
    }

    // Attempt fuzzy search by name. Assuming search returns matches.
    const results = await this.studentRepo.search(
      { searchTerm: paymentCandidate.studentName },
      1,
      10,
    );

    if (results.total === 1) {
      return {
        matchedStudentIds: [results.data[0].id],
        score: this.weight,
        ruleName: this.name,
      };
    } else if (results.total > 1) {
      return {
        matchedStudentIds: results.data.map((s) => s.id),
        score: this.weight / 2,
        ruleName: this.name,
      };
    }

    return { matchedStudentIds: [], score: 0, ruleName: this.name };
  }
}
