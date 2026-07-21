import { Injectable } from '@nestjs/common';
import { BaseMatchingRule } from '../rules/base.rule';
import { AdmissionNumberRule } from '../rules/admission-number.rule';
import { StudentNameRule } from '../rules/student-name.rule';
import { RuleEvaluationResult } from '../interfaces/matching.interfaces';
import { MATCH_RESULT_STATUS } from '../constants/matching.constants';

@Injectable()
export class MatchingEngine {
  private rules: BaseMatchingRule[];

  constructor(
    admissionNumberRule: AdmissionNumberRule,
    studentNameRule: StudentNameRule,
  ) {
    this.rules = [admissionNumberRule, studentNameRule];
  }

  async match(candidate: any) {
    let totalScore = 0;
    const matchedIds = new Set<string>();
    const ruleResults: RuleEvaluationResult[] = [];

    for (const rule of this.rules) {
      const result = await rule.evaluate(candidate);
      ruleResults.push(result);

      if (result.score > 0) {
        totalScore += result.score;
        result.matchedStudentIds.forEach((id) => matchedIds.add(id));
      }
    }

    const uniqueMatches = Array.from(matchedIds);
    let status = MATCH_RESULT_STATUS.NO_MATCH;

    if (uniqueMatches.length === 1) {
      status =
        totalScore >= 50
          ? MATCH_RESULT_STATUS.MATCHED
          : MATCH_RESULT_STATUS.LOW_CONFIDENCE;
    } else if (uniqueMatches.length > 1) {
      status = MATCH_RESULT_STATUS.MULTIPLE_MATCHES;
    }

    if (
      status === MATCH_RESULT_STATUS.LOW_CONFIDENCE ||
      status === MATCH_RESULT_STATUS.MULTIPLE_MATCHES
    ) {
      status = MATCH_RESULT_STATUS.MANUAL_REVIEW;
    }

    return {
      status,
      score: totalScore,
      matchedIds: uniqueMatches,
      breakdown: ruleResults,
    };
  }
}
