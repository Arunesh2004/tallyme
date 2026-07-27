import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { IAccountingTemplate } from './accounting-template.interface';

@Injectable()
export class AccountingTemplateEngine {
  constructor(private readonly prisma: PrismaService) {}

  async getTemplate(
    industry: string = 'SCHOOL',
  ): Promise<IAccountingTemplate | null> {
    const template = await this.prisma.accountingTemplate.findFirst({
      where: { industry },
    });

    if (!template) {
      return null;
    }

    return {
      id: template.id,
      name: template.name || '',
      industry: template.industry || '',
      version: template.version,
      structureDefinition: template.structureDefinition as Record<string, any>,
      ruleDefinitions: template.ruleDefinitions as Record<string, any>,
      metadata: template.metadata as Record<string, any>,
      createdAt: template.createdAt,
    };
  }

  async seedSchoolTemplate(): Promise<IAccountingTemplate> {
    const existing = await this.getTemplate('SCHOOL');
    if (existing) return existing;

    const structure = {
      groups: [
        'Vendor Details',
        'Sundry Creditors',
        'Student Details',
        'Student Fee Receivable',
      ],
      incomeLedgers: ['Tuition Fee Income', 'Transport Income'],
      expenseLedgers: ['Stationery Expense', 'Salary', 'Maintenance'],
    };

    const created = await this.prisma.accountingTemplate.create({
      data: {
        name: 'Standard School Template',
        industry: 'SCHOOL',
        version: '1.0.0',
        structureDefinition: structure,
        ruleDefinitions: {},
        metadata: { description: 'Default template for K-12 schools' },
      },
    });

    return {
      id: created.id,
      name: created.name || '',
      industry: created.industry || '',
      version: created.version,
      structureDefinition: created.structureDefinition as Record<string, any>,
      ruleDefinitions: created.ruleDefinitions as Record<string, any>,
      metadata: created.metadata as Record<string, any>,
      createdAt: created.createdAt,
    };
  }
}
