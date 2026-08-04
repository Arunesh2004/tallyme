import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';

describe('OrganizationService', () => {
  let service: OrganizationService;

  const mockTx = {
    organization: { create: jest.fn() },
    roleAssignment: { create: jest.fn() },
  };

  const mockPrisma = {
    organization: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    company: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    roleAssignment: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    vendor: { findMany: jest.fn() },
    student: { findMany: jest.fn() },
    document: { findMany: jest.fn() },
    voucherCandidate: { findMany: jest.fn() },
    approvalBatch: { findMany: jest.fn() },
    migrationPlan: { findMany: jest.fn() },
    auditLog: { create: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn((fn: (tx: typeof mockTx) => Promise<any>) => fn(mockTx)),
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<OrganizationService>(OrganizationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrganization', () => {
    it('should create an organization with admin role assignment', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);
      const createdOrg = { id: 'org-1', name: 'Test Corp', slug: 'test-corp' };
      mockTx.organization.create.mockResolvedValue(createdOrg);
      mockTx.roleAssignment.create.mockResolvedValue(undefined);

      const result = await service.createOrganization('Test Corp', 'test-corp', 'user-1');

      expect(result).toEqual(createdOrg);
      expect(mockTx.organization.create).toHaveBeenCalledWith({
        data: { name: 'Test Corp', slug: 'test-corp' },
      });
      expect(mockTx.roleAssignment.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          organizationId: 'org-1',
          role: 'ACCOUNTING_ADMIN',
        },
      });
    });

    it('should throw BadRequestException when slug is already taken', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-existing',
        slug: 'taken-slug',
      });

      await expect(
        service.createOrganization('New Corp', 'taken-slug', 'user-1'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createOrganization('New Corp', 'taken-slug', 'user-1'),
      ).rejects.toThrow('Organization slug already taken');
    });
  });

  describe('getUserOrganizations', () => {
    it('should return organizations with user roles', async () => {
      mockPrisma.roleAssignment.findMany.mockResolvedValue([
        { userId: 'user-1', organizationId: 'org-1', role: 'ACCOUNTING_ADMIN' },
        { userId: 'user-1', organizationId: 'org-2', role: 'VIEWER' },
      ]);
      mockPrisma.organization.findMany.mockResolvedValue([
        { id: 'org-1', name: 'Corp A', slug: 'corp-a' },
        { id: 'org-2', name: 'Corp B', slug: 'corp-b' },
      ]);

      const result = await service.getUserOrganizations('user-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ id: 'org-1', role: 'ACCOUNTING_ADMIN' });
      expect(result[1]).toMatchObject({ id: 'org-2', role: 'VIEWER' });
    });

    it('should return empty array when user has no role assignments', async () => {
      mockPrisma.roleAssignment.findMany.mockResolvedValue([]);

      const result = await service.getUserOrganizations('user-no-orgs');

      expect(result).toEqual([]);
      expect(mockPrisma.organization.findMany).not.toHaveBeenCalled();
    });
  });

  describe('createCompany', () => {
    it('should create a company in an organization', async () => {
      const company = { id: 'comp-1', name: 'Branch A', organizationId: 'org-1' };
      mockPrisma.company.create.mockResolvedValue(company);

      const result = await service.createCompany('org-1', 'Branch A');

      expect(result).toEqual(company);
      expect(mockPrisma.company.create).toHaveBeenCalledWith({
        data: { name: 'Branch A', organizationId: 'org-1' },
      });
    });
  });

  describe('getOrganizationCompanies', () => {
    it('should return all companies in an organization', async () => {
      const companies = [
        { id: 'comp-1', name: 'Branch A' },
        { id: 'comp-2', name: 'Branch B' },
      ];
      mockPrisma.company.findMany.mockResolvedValue(companies);

      const result = await service.getOrganizationCompanies('org-1');

      expect(result).toEqual(companies);
      expect(mockPrisma.company.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
      });
    });
  });

  describe('exportOrganizationData', () => {
    beforeEach(() => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org-1', name: 'Test' });
      mockPrisma.company.findMany.mockResolvedValue([{ id: 'comp-1', name: 'Company A' }]);
      mockPrisma.roleAssignment.findMany.mockResolvedValue([
        {
          organizationId: 'org-1',
          role: 'ADMIN',
          user: { id: 'user-1', email: 'admin@test.com', passwordHash: 'hash-secret' },
        },
      ]);
      mockPrisma.vendor.findMany.mockResolvedValue([]);
      mockPrisma.student.findMany.mockResolvedValue([]);
      mockPrisma.document.findMany.mockResolvedValue([]);
      mockPrisma.voucherCandidate.findMany.mockResolvedValue([]);
      mockPrisma.approvalBatch.findMany.mockResolvedValue([]);
      mockPrisma.migrationPlan.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.create.mockResolvedValue(undefined);
    });

    it('should return complete organization data export', async () => {
      const result = await service.exportOrganizationData('org-1', 'user-1');

      expect(result).toMatchObject({
        organization: { id: 'org-1', name: 'Test' },
        companies: [{ id: 'comp-1' }],
        vendors: [],
        students: [],
        documents: [],
      });
    });

    it('should redact passwordHash from user data', async () => {
      const result = await service.exportOrganizationData('org-1', 'user-1');

      expect(result.users[0]).not.toHaveProperty('passwordHash');
      expect(result.users[0]).toHaveProperty('email', 'admin@test.com');
    });

    it('should create an audit log entry for the export', async () => {
      await service.exportOrganizationData('org-1', 'user-1');

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          organizationId: 'org-1',
          action: 'DATA_EXPORT',
          entity: 'Organization',
          entityId: 'org-1',
          reason: 'User requested data export',
        },
      });
    });
  });
});
