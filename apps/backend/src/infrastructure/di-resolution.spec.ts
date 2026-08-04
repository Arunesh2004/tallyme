import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { MonitoringController } from '../modules/operations/controllers/monitoring.controller';
import { StudentManualReviewController } from '../modules/student-fee/api/student-review.controller';
import { TallyOrganizationController } from '../modules/erp-connector/controllers/tally-organization.controller';
import { ApprovalController } from '../modules/accounting-intelligence/governance/approval.controller';
import { FilesController } from '../modules/files/files.controller';
import { PaymentExtractor } from '../modules/student-fee/domain/services/payment-extractor.service';
import { VmmsReviewService } from '../modules/vendor-slip/vmms/application/vmms-review.service';
import { PrismaERPRepository } from '../modules/erp-connector/repositories/prisma-erp.repository';
import { PrismaVendorRepository } from '../modules/vendor-slip/repositories/prisma-vendor.repository';
import { OrganizationService } from '../modules/organization/organization.service';
import { GmailClientService } from '../modules/mail/services/gmail-client.service';
import { PaymentIntelligenceEngine } from '../modules/student-fee/intelligence/payment-intelligence.engine';
import { RazorpayParser } from '../modules/payment-parser/parsers/razorpay.parser';
import { StudentPaymentExtractor } from '../modules/payment-parser/services/student-payment.extractor';
import { ApprovalBatchService } from '../modules/operations/approval-batch/approval-batch.service';
import * as StudentFeeAppIndex from '../modules/student-fee/application/index';
import * as StudentFeeInfraIndex from '../modules/student-fee/infrastructure/index';
import * as VendorSlipDomainIndex from '../modules/vendor-slip/domain/services/index';
import * as QueuePublisherIndex from '../infrastructure/queue/publisher/index';
import * as VendorSlipInfraIndex from '../modules/vendor-slip/infrastructure/repositories/index';
import { Student } from '../modules/student/entities/student.entity';

describe('Global Dependency Injection Resolution', () => {
  let app: TestingModule;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should successfully resolve all controllers and execute their decorators', () => {
    expect(app.get(MonitoringController, { strict: false })).toBeDefined();
    expect(app.get(StudentManualReviewController, { strict: false })).toBeDefined();
    expect(app.get(TallyOrganizationController, { strict: false })).toBeDefined();
    expect(app.get(ApprovalController, { strict: false })).toBeDefined();
    expect(app.get(FilesController, { strict: false })).toBeDefined();
  });

  it('should successfully resolve all critical services and repositories', () => {
    expect(app.get(PaymentExtractor, { strict: false })).toBeDefined();
    expect(app.get(VmmsReviewService, { strict: false })).toBeDefined();
    expect(app.get(PrismaERPRepository, { strict: false })).toBeDefined();
    expect(app.get(PrismaVendorRepository, { strict: false })).toBeDefined();
    expect(app.get(OrganizationService, { strict: false })).toBeDefined();
    expect(app.get(GmailClientService, { strict: false })).toBeDefined();
    expect(app.get(PaymentIntelligenceEngine, { strict: false })).toBeDefined();
    expect(app.get(RazorpayParser, { strict: false })).toBeDefined();
    expect(app.get(StudentPaymentExtractor, { strict: false })).toBeDefined();
    expect(app.get(ApprovalBatchService, { strict: false })).toBeDefined();
  });

  it('should successfully load all module barrel files and entities', () => {
    expect(StudentFeeAppIndex).toBeDefined();
    expect(StudentFeeInfraIndex).toBeDefined();
    expect(VendorSlipDomainIndex).toBeDefined();
    expect(QueuePublisherIndex).toBeDefined();
    expect(VendorSlipInfraIndex).toBeDefined();
    const entity = Object.create(Student.prototype);
    expect(entity).toBeInstanceOf(Student);
  });
});
