// src/infrastructure/ai/security/prompt-injection.filter.ts
import { Injectable } from '@nestjs/common';
import { Result, fail, ok } from '../../../shared/domain/result';

@Injectable()
export class PromptInjectionFilter {
  
  private readonly HEURISTICS = [
    /ignore previous instructions/i,
    /system directive:/i,
    /override/i,
    /you are now/i,
    /forget all/i
  ];

  evaluate(rawOcrText: string): Result<boolean, string> {
    for (const pattern of this.HEURISTICS) {
      if (pattern.test(rawOcrText)) {
        return fail(`Prompt Injection heuristic triggered: matched ${pattern}`);
      }
    }
    return ok(true);
  }
}
