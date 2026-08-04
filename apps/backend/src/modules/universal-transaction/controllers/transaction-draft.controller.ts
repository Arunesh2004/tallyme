import { Controller, Get, Param, Patch, Post, Body, UseInterceptors, UseGuards, Req, UsePipes, ValidationPipe, UnauthorizedException } from '@nestjs/common';
import { TransactionDraftService } from '../services/transaction-draft.service';
import { DraftApprovalOrchestrator } from '../services/draft-approval.orchestrator';
import { VoucherReadinessEngine } from '../services/voucher-readiness.engine';
import { UpdateDraftDto, ActionDraftDto, CanonicalAccountingModelDto } from '../dto/transaction.dto';
import { CanonicalAccountingModel } from '../domain/types';
import { IdempotencyInterceptor } from '../../../infrastructure/api/middlewares/idempotency.interceptor';
import { CompanyIntelligenceService } from '../../accounting-intelligence/company/company-intelligence.service';
import { ErpCapabilityService } from '../../accounting-intelligence/erp-capability/erp-capability.service';
import { HistoricalIntelligenceService } from '../../accounting-intelligence/historical/historical-intelligence.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiBearerAuth } from '@nestjs/swagger';
import { AccountingPolicyService } from '../../accounting-policy/services/accounting-policy.service';
import { ValidationSeverity } from '../domain/enums';

@ApiTags('Transactions Drafts')
@ApiBearerAuth()
@Controller('api/v2/transactions/drafts')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
export class TransactionDraftController {
  constructor(
    private readonly service: TransactionDraftService,
    private readonly orchestrator: DraftApprovalOrchestrator,
    private readonly readinessEngine: VoucherReadinessEngine,
    private readonly companyIntelligenceService: CompanyIntelligenceService,
    private readonly erpCapabilityService: ErpCapabilityService,
    private readonly historicalIntelligenceService: HistoricalIntelligenceService,
    private readonly accountingPolicyService: AccountingPolicyService,
  ) {}

  private validateUser(req: any) {
    if (!req.user?.organizationId) throw new UnauthorizedException('Organization ID missing from token');
    if (!req.user?.id) throw new UnauthorizedException('User ID missing from token');
    return { id: req.user.id, organizationId: req.user.organizationId };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific Transaction Draft' })
  @ApiResponse({ status: 200, description: 'Draft returned successfully.' })
  @ApiResponse({ status: 404, description: 'Draft not found.' })
  async getDraft(@Param('id') id: string, @Req() req: any) {
    const user = this.validateUser(req);
    return await this.service.getDraft(id, user.organizationId);
  }

  @Get(':id/readiness')
  @ApiOperation({ summary: 'Evaluate readiness of a Transaction Draft' })
  @ApiResponse({ status: 200, description: 'Readiness evaluated successfully.' })
  @ApiResponse({ status: 404, description: 'Draft not found.' })
  async getReadiness(@Param('id') id: string, @Req() req: any) {
    const user = this.validateUser(req);
    const draft = await this.service.getDraft(id, user.organizationId);
    
    const payload = draft.payload as unknown as CanonicalAccountingModel;
    const companyProfile = await this.companyIntelligenceService.getProfile(draft.tenantId);
    const erpProfile = this.erpCapabilityService.getProfile('TALLY'); // Replace with logic to determine current ERP if multi-ERP
    const vendorId = payload.parties?.vendorId;
    const historicalIntelligence = await this.historicalIntelligenceService.getSuggestions(draft.tenantId, vendorId);

    // Apply Real Accounting Policy Engine
    const policyResult = await this.accountingPolicyService.applyCompanyRules(draft.tenantId, payload);
    const structuralErrors = policyResult.errors.filter(e => ['header.tenantId', 'header.transactionIntent', 'header.currency'].includes(e.fieldPath || '')).map(e => e.message);
    const businessErrors = policyResult.errors.filter(e => !['header.tenantId', 'header.transactionIntent', 'header.currency'].includes(e.fieldPath || '')).map(e => e.message);

    const input = {
      validationReport: {
        structural: { valid: structuralErrors.length === 0, errors: structuralErrors, warnings: [] },
        business: { valid: businessErrors.length === 0, errors: businessErrors, warnings: policyResult.warnings.map(w => w.message) },
        erp: { valid: true, errors: [], warnings: [] }, // ERP rules are verified dynamically in the readiness engine itself via ErpCapabilityService
        blockingIssues: []
      },
      companyProfile,
      erpProfile,
      historicalIntelligence,
      aiSuggestions: [], // AI predictions are usually captured at creation time in the draft payload, or fetched from another service
      completionDraft: {
        originalDraftId: draft.id,
        editablePayload: {},
        version: 1
      },
      immutablePayload: draft.payload as any
    };

    return this.readinessEngine.evaluate(input);
  }

  @Post()
  @Roles('ACCOUNTANT', 'OPERATOR', 'ACCOUNTING_ADMIN')
  @UseInterceptors(IdempotencyInterceptor)
  @ApiOperation({ summary: 'Create a new Transaction Draft' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiResponse({ status: 201, description: 'Draft created successfully.' })
  @ApiResponse({ status: 400, description: 'Validation failed or Exact Duplicate detected.' })
  async createDraft(
    @Body() dto: CanonicalAccountingModelDto,
    @Req() req: any
  ) {
    const user = this.validateUser(req);
    return await this.service.createDraft(dto, user.id);
  }

  @Patch(':id')
  @Roles('ACCOUNTANT', 'OPERATOR', 'ACCOUNTING_ADMIN')
  @UseInterceptors(IdempotencyInterceptor)
  @ApiOperation({ summary: 'Update a Transaction Draft' })
  @ApiHeader({ name: 'Idempotency-Key', required: true, description: 'Unique key for safe retries' })
  @ApiResponse({ status: 200, description: 'Draft updated successfully.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 404, description: 'Draft not found.' })
  @ApiResponse({ status: 409, description: 'Optimistic locking conflict or Idempotency conflict.' })
  @ApiResponse({ status: 422, description: 'Unprocessable Entity.' })
  async updateDraft(
    @Param('id') id: string,
    @Body() dto: UpdateDraftDto,
    @Req() req: any
  ) {
    const user = this.validateUser(req);
    return await this.service.updateDraft(id, user.id, user.organizationId, dto);
  }

  @Post(':id/approve')
  @Roles('APPROVAL_ADMIN', 'ACCOUNTING_ADMIN')
  @UseInterceptors(IdempotencyInterceptor)
  @ApiOperation({ summary: 'Approve a Transaction Draft' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiResponse({ status: 200, description: 'Draft approved successfully.' })
  @ApiResponse({ status: 400, description: 'Draft fails accounting policy validation.' })
  @ApiResponse({ status: 404, description: 'Draft not found.' })
  @ApiResponse({ status: 409, description: 'Optimistic locking conflict or Idempotency conflict.' })
  @ApiResponse({ status: 422, description: 'Unprocessable Entity.' })
  async approveDraft(
    @Param('id') id: string,
    @Body() dto: ActionDraftDto,
    @Req() req: any
  ) {
    const user = this.validateUser(req);
    return await this.orchestrator.approveDraft(id, user.id, user.organizationId, dto);
  }

  @Post(':id/reject')
  @Roles('APPROVAL_ADMIN', 'ACCOUNTING_ADMIN')
  @UseInterceptors(IdempotencyInterceptor)
  @ApiOperation({ summary: 'Reject a Transaction Draft' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiResponse({ status: 200, description: 'Draft rejected successfully.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 404, description: 'Draft not found.' })
  @ApiResponse({ status: 409, description: 'Optimistic locking conflict or Idempotency conflict.' })
  async rejectDraft(
    @Param('id') id: string,
    @Body() dto: ActionDraftDto,
    @Req() req: any
  ) {
    const user = this.validateUser(req);
    return await this.service.rejectDraft(id, user.id, user.organizationId, dto);
  }

  @Post(':id/retry')
  @Roles('ACCOUNTING_ADMIN', 'SYSTEM_ADMIN')
  @UseInterceptors(IdempotencyInterceptor)
  @ApiOperation({ summary: 'Retry a Failed Transaction Draft' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiResponse({ status: 200, description: 'Draft retry initiated.' })
  @ApiResponse({ status: 400, description: 'Draft is not in FAILED state.' })
  @ApiResponse({ status: 404, description: 'Draft not found.' })
  async retryDraft(
    @Param('id') id: string,
    @Req() req: any
  ) {
    const user = this.validateUser(req);
    return await this.service.retryFailedDraft(id, user.id, user.organizationId);
  }
}

