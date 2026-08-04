import { Module } from '@nestjs/common';
import { AIModelService } from './ai-model.service';
import { AIEvaluationService } from './ai-evaluation.service';
import { AIFeedbackService } from './ai-feedback.service';
import { DocumentReviewService } from './services/document-review.service';
import { DocumentReviewController } from './controllers/document-review.controller';
import { UniversalTransactionModule } from '../universal-transaction/universal-transaction.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [UniversalTransactionModule, AuditModule],
  controllers: [DocumentReviewController],
  providers: [AIModelService, AIEvaluationService, AIFeedbackService, DocumentReviewService],
  exports: [AIModelService, AIEvaluationService, AIFeedbackService, DocumentReviewService],
})
export class AIGovernanceModule {}
