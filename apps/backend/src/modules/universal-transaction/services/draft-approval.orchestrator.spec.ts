import { Test, TestingModule } from '@nestjs/testing';
import { DraftApprovalOrchestrator } from './draft-approval.orchestrator';
import { TransactionDraftService } from './transaction-draft.service';

describe('DraftApprovalOrchestrator', () => {
  let orchestrator: DraftApprovalOrchestrator;
  let draftService: any;

  beforeEach(async () => {
    draftService = {
      approveDraft: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DraftApprovalOrchestrator,
        { provide: TransactionDraftService, useValue: draftService },
      ],
    }).compile();

    orchestrator = module.get<DraftApprovalOrchestrator>(
      DraftApprovalOrchestrator,
    );
  });

  it('should call approveDraft', async () => {
    const mockDraft = { id: 'draft-123', status: 'APPROVED' };
    draftService.approveDraft.mockResolvedValue(mockDraft);

    const dto: any = { currentVersion: 1 };
    const result = await orchestrator.approveDraft(
      'draft-123',
      'user-1',
      'tenant-1',
      dto,
    );

    expect(result).toEqual(mockDraft);
    expect(draftService.approveDraft).toHaveBeenCalledWith(
      'draft-123',
      'user-1',
      'tenant-1',
      dto,
    );
  });

  it('should propagate errors', async () => {
    draftService.approveDraft.mockRejectedValue(new Error('Validation failed'));

    const dto: any = { currentVersion: 1 };
    await expect(
      orchestrator.approveDraft('draft-123', 'user-1', 'tenant-1', dto),
    ).rejects.toThrow('Validation failed');
  });
});
