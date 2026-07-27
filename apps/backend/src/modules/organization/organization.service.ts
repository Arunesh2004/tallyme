import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrganization(name: string, slug: string, userId: string) {
    const existing = await this.prisma.organization.findUnique({
      where: { slug },
    });
    if (existing)
      throw new BadRequestException('Organization slug already taken');

    return this.prisma.$transaction(async (tx: any) => {
      const org = await tx.organization.create({
        data: { name, slug },
      });

      await tx.roleAssignment.create({
        data: {
          userId,
          organizationId: org.id,
          role: 'ACCOUNTING_ADMIN',
        },
      });

      return org;
    });
  }

  async getUserOrganizations(userId: string) {
    const assignments = await this.prisma.roleAssignment.findMany({
      where: { userId },
    });

    const orgIds = assignments.map((a: any) => a.organizationId);
    if (orgIds.length === 0) return [];

    const orgs = await this.prisma.organization.findMany({
      where: { id: { in: orgIds } },
    });

    return assignments.map((a: any) => {
      const org = orgs.find((o: any) => o.id === a.organizationId);
      return { ...org, role: a.role };
    });
  }

  async createCompany(organizationId: string, name: string) {
    return this.prisma.company.create({
      data: {
        name,
        organizationId,
      },
    });
  }

  async getOrganizationCompanies(organizationId: string) {
    return this.prisma.company.findMany({
      where: { organizationId },
    });
  }

  async exportOrganizationData(organizationId: string, userId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
    const companies = await this.prisma.company.findMany({
      where: { organizationId },
    });
    const companyIds = companies.map((c) => c.id);

    const users = await this.prisma.roleAssignment.findMany({
      where: { organizationId },
      include: { user: true },
    });

    const redactedUsers = users.map((u) => {
      const { passwordHash, ...safeUser } = u.user;
      return safeUser;
    });

    const vendors = await this.prisma.vendor.findMany({
      where: { OR: [{ organizationId }, { companyId: { in: companyIds } }] },
    });
    const students = await this.prisma.student.findMany({
      where: { OR: [{ organizationId }, { companyId: { in: companyIds } }] },
    });
    const documents = await this.prisma.document.findMany({
      where: { OR: [{ organizationId }, { companyId: { in: companyIds } }] },
    });
    const voucherCandidates = await this.prisma.voucherCandidate.findMany({
      where: { companyId: { in: companyIds } },
    });
    const approvals = await this.prisma.approvalBatch.findMany({
      where: { OR: [{ organizationId }, { companyId: { in: companyIds } }] },
    });
    const migrations = await this.prisma.migrationPlan.findMany({
      where: { OR: [{ organizationId }, { companyId: { in: companyIds } }] },
    });
    const auditLogs = await this.prisma.auditLog.findMany({
      where: { OR: [{ organizationId }, { companyId: { in: companyIds } }] },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        organizationId,
        action: 'DATA_EXPORT',
        entity: 'Organization',
        entityId: organizationId,
        reason: 'User requested data export',
      },
    });

    return {
      organization: org,
      companies,
      users: redactedUsers,
      vendors,
      students,
      documents,
      voucherCandidates,
      approvals,
      migrations,
      auditLogs,
    };
  }
}
