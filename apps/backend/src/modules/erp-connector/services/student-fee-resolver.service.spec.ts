import { Test, TestingModule } from '@nestjs/testing';
import { StudentFeeResolverService } from './student-fee-resolver.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

describe('StudentFeeResolverService', () => {
  let service: StudentFeeResolverService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      tallyMasterMapping: {
        findFirst: jest.fn(),
      },
      accountingReconciliation: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentFeeResolverService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<StudentFeeResolverService>(StudentFeeResolverService);
  });

  it('should return VALID if student mapping exists and no duplicate payment', async () => {
    prisma.tallyMasterMapping.findFirst.mockResolvedValue({ tallyName: 'John Doe' });
    prisma.accountingReconciliation.findFirst.mockResolvedValue(null);

    const result = await service.resolveStudentFee({ reference: 'REF123', studentId: 'S1' }, 'C1');
    
    expect(result.status).toBe('VALID');
    expect(result.student).toBe('John Doe');
  });

  it('should return INVALID if student mapping is missing', async () => {
    prisma.tallyMasterMapping.findFirst.mockResolvedValue(null);
    prisma.accountingReconciliation.findFirst.mockResolvedValue(null);

    const result = await service.resolveStudentFee({ reference: 'REF123', studentId: 'S1' }, 'C1');
    
    expect(result.status).toBe('INVALID');
    expect(result.errors).toContain('Student mapping not found in Tally');
  });

  it('should return INVALID if payment is duplicated', async () => {
    prisma.tallyMasterMapping.findFirst.mockResolvedValue({ tallyName: 'John Doe' });
    prisma.accountingReconciliation.findFirst.mockResolvedValue({ id: 'rec-1' });

    const result = await service.resolveStudentFee({ reference: 'REF123', studentId: 'S1' }, 'C1');
    
    expect(result.status).toBe('INVALID');
    expect(result.errors).toContain('Payment duplicated in reconciliation records');
  });

  it('should return INVALID with multiple errors if both checks fail', async () => {
    prisma.tallyMasterMapping.findFirst.mockResolvedValue(null);
    prisma.accountingReconciliation.findFirst.mockResolvedValue({ id: 'rec-1' });

    const result = await service.resolveStudentFee({ reference: 'REF123', studentId: 'S1' }, 'C1');
    
    expect(result.status).toBe('INVALID');
    expect(result.errors).toContain('Student mapping not found in Tally');
    expect(result.errors).toContain('Payment duplicated in reconciliation records');
  });
});
