import { Test, TestingModule } from '@nestjs/testing';
import { TallyDiscoveryService } from './tally-discovery.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { TallyDiscoveryAdapter } from '../../erp-connector/services/tally-discovery.adapter';

describe('TallyDiscoveryService', () => {
  let service: TallyDiscoveryService;
  let prisma: any;
  let erpAdapter: any;

  beforeEach(async () => {
    prisma = {
      tallyCompanyDiscovery: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      tallyDiscoveryReport: {
        create: jest.fn().mockResolvedValue({ id: 'report-1' }),
      },
    };

    erpAdapter = {
      fetchCompanies: jest.fn().mockResolvedValue([{ name: 'Acme Corp' }]),
      fetchLedgers: jest.fn().mockResolvedValue([{ name: 'Cash' }]),
      fetchGroups: jest.fn().mockResolvedValue([{ name: 'Expenses' }]),
      fetchVoucherTypes: jest.fn().mockResolvedValue([{ name: 'Purchase' }]),
      fetchCostCentres: jest.fn().mockResolvedValue([{ name: 'Operations' }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TallyDiscoveryService,
        { provide: PrismaService, useValue: prisma },
        { provide: TallyDiscoveryAdapter, useValue: erpAdapter },
      ],
    }).compile();

    service = module.get<TallyDiscoveryService>(TallyDiscoveryService);
  });

  it('should run discovery and return report id', async () => {
    const id = await service.runDiscovery('comp-1', 'user-1');
    expect(id).toBe('report-1');
    expect(erpAdapter.fetchCompanies).toHaveBeenCalled();
    expect(erpAdapter.fetchLedgers).toHaveBeenCalled();
    expect(prisma.tallyCompanyDiscovery.deleteMany).toHaveBeenCalled();
    expect(prisma.tallyCompanyDiscovery.createMany).toHaveBeenCalledWith({
      data: [{ connectionId: 'comp-1', companyName: 'Acme Corp', active: true }],
    });
    expect(prisma.tallyDiscoveryReport.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ companyId: 'comp-1', status: 'COMPLETED' }),
    });
  });

  it('should not call createMany if companies is empty', async () => {
    erpAdapter.fetchCompanies.mockResolvedValue([]);
    await service.runDiscovery('comp-1', 'user-1');
    expect(prisma.tallyCompanyDiscovery.createMany).not.toHaveBeenCalled();
  });

  it('should handle discovery failure and create CONNECTION_FAILED report', async () => {
    erpAdapter.fetchCompanies.mockRejectedValue(new Error('Connection refused'));
    const id = await service.runDiscovery('comp-1', 'user-1');
    expect(id).toBe('report-1');
    expect(prisma.tallyDiscoveryReport.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: 'CONNECTION_FAILED' }),
    });
  });
});
