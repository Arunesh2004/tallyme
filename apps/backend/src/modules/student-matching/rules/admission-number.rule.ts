import { Injectable, Inject } from '@nestjs/common';
import { BaseMatchingRule } from './base.rule';
import { RuleEvaluationResult } from '../interfaces/matching.interfaces';
import {
  IStudentRepository,
  STUDENT_REPOSITORY,
} from '../../student/interfaces/student.repository.interface';

@Injectable()
export class AdmissionNumberRule extends BaseMatchingRule {
  name = 'AdmissionNumberRule';
  weight = 50;

  constructor(
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepo: IStudentRepository,
  ) {
    super();
  }

  async evaluate(paymentCandidate: any): Promise<RuleEvaluationResult> {
    if (!paymentCandidate.admissionNumber) {
      return { matchedStudentIds: [], score: 0, ruleName: this.name };
    }

    const student = await this.studentRepo.findByAdmissionNumber(
      paymentCandidate.admissionNumber,
    );
    if (student) {
      return {
        matchedStudentIds: [student.id],
        score: this.weight,
        ruleName: this.name,
      };
    }

    return { matchedStudentIds: [], score: 0, ruleName: this.name };
  }
}
