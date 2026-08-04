import { Test, TestingModule } from '@nestjs/testing';
import { ConfigCompanyResolver } from './company-resolver.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { TallyDiscoveryAdapter } from './tally-discovery.adapter';

describe('ConfigCompanyResolver', () => {
  let service: ConfigCompanyResolver;
  let configService: any;
  let prisma: any;
  let erpAdapter: any;

  beforeEach(async () => {
    configService = {
      get: jest.fn(),
    };
    prisma = {
      tallyCompanyDiscovery: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      tallyMasterMapping: {
        findFirst: jest.fn(),
      },
    };
    erpAdapter = {
      fetchCompanies: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigCompanyResolver,
        { provide: ConfigService, useValue: configService },
        { provide: PrismaService, useValue: prisma },
        { provide: TallyDiscoveryAdapter, useValue: erpAdapter },
      ],
    }).compile();

    service = module.get<ConfigCompanyResolver>(ConfigCompanyResolver);
  });

  it('should return config company name when no companyId provided', async () => {
    configService.get.mockReturnValue('Global Corp');
    const result = await service.resolveCompanyName();
    expect(result).toBe('Global Corp');
  });

  it('should throw if no companyId and no config name', async () => {
    configService.get.mockReturnValue(undefined);
    await expect(service.resolveCompanyName()).rejects.toThrow('No company ID provided');
  });

  it('should return single discovered company directly', async () => {
    const recent = new Date();
    prisma.tallyCompanyDiscovery.findMany.mockResolvedValue([
      { companyName: 'Acme Corp', createdAt: recent },
    ]);
    const result = await service.resolveCompanyName('comp-1');
    expect(result).toBe('Acme Corp');
  });

  it('should refresh stale discovery and return updated company', async () => {
    // Stale = old timestamp (2h ago)
    const stale = new Date(Date.now() - 2 * 60 * 60 * 1000);
    prisma.tallyCompanyDiscovery.findMany
      .mockResolvedValueOnce([{ companyName: 'Old Corp', createdAt: stale }])
      .mockResolvedValueOnce([{ companyName: 'Fresh Corp', createdAt: new Date() }]);
    erpAdapter.fetchCompanies.mockResolvedValue([{ name: 'Fresh Corp' }]);

    const result = await service.resolveCompanyName('comp-1');
    expect(result).toBe('Fresh Corp');
  });

  it('should throw when no companies are discovered', async () => {
    prisma.tallyCompanyDiscovery.findMany.mockResolvedValue([]);
    erpAdapter.fetchCompanies.mockResolvedValue([]);
    await expect(service.resolveCompanyName('comp-1')).rejects.toThrow('No Tally companies discovered');
  });

  it('should use mapping when multiple companies discovered', async () => {
    const recent = new Date();
    prisma.tallyCompanyDiscovery.findMany.mockResolvedValue([
      { companyName: 'Acme Corp', companyGuid: 'guid-1', createdAt: recent },
      { companyName: 'Beta Corp', companyGuid: 'guid-2', createdAt: recent },
    ]);
    prisma.tallyMasterMapping.findFirst.mockResolvedValue({ tallyName: 'Acme Corp', tallyGuid: 'guid-1' });

    const result = await service.resolveCompanyName('comp-1');
    expect(result).toBe('Acme Corp');
  });

  it('should throw when multiple companies found but no mapping', async () => {
    const recent = new Date();
    prisma.tallyCompanyDiscovery.findMany.mockResolvedValue([
      { companyName: 'Acme', companyGuid: 'g1', createdAt: recent },
      { companyName: 'Beta', companyGuid: 'g2', createdAt: recent },
    ]);
    prisma.tallyMasterMapping.findFirst.mockResolvedValue(null);

    await expect(service.resolveCompanyName('comp-1')).rejects.toThrow('Multiple Tally companies discovered');
  });
});
