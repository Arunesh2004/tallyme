import { Test, TestingModule } from '@nestjs/testing';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('AuditController', () => {
  let controller: AuditController;
  let service: jest.Mocked<AuditService>;

  beforeEach(async () => {
    const mockService = {
      getTimeline: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [{ provide: AuditService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuditController>(AuditController);
    service = module.get(AuditService);
  });

  it('should call getTimeline with parsed query params', async () => {
    service.getTimeline.mockResolvedValue([]);
    await controller.getTimeline('entity-1', undefined, '10', '20');

    expect(service.getTimeline).toHaveBeenCalledWith('entity-1', undefined, 10, 20);
  });
});
