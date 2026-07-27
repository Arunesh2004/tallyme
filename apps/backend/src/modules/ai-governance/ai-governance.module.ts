import { Module } from '@nestjs/common';
import { AIModelService } from './ai-model.service';
import { AIEvaluationService } from './ai-evaluation.service';
import { AIFeedbackService } from './ai-feedback.service';

@Module({
  providers: [AIModelService, AIEvaluationService, AIFeedbackService],
  exports: [AIModelService, AIEvaluationService, AIFeedbackService],
})
export class AIGovernanceModule {}
