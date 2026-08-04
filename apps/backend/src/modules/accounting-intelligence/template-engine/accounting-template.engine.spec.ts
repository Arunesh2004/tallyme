import { Test, TestingModule } from '@nestjs/testing';
import { AccountingTemplateEngine } from './accounting-template.engine';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

describe('AccountingTemplateEngine', () => {
  let engine: AccountingTemplateEngine;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      accountingTemplate: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountingTemplateEngine,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    engine = module.get<AccountingTemplateEngine>(AccountingTemplateEngine);
  });

  describe('getTemplate', () => {
    it('should return null if no template found', async () => {
      prisma.accountingTemplate.findFirst.mockResolvedValue(null);
      const result = await engine.getTemplate('SCHOOL');
      expect(result).toBeNull();
    });

    it('should return template if found', async () => {
      const mockTemplate = {
        id: 't-1',
        name: 'Standard School Template',
        industry: 'SCHOOL',
        version: '1.0.0',
        structureDefinition: {},
        ruleDefinitions: {},
        metadata: {},
        createdAt: new Date(),
      };
      prisma.accountingTemplate.findFirst.mockResolvedValue(mockTemplate);
      const result = await engine.getTemplate('SCHOOL');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('t-1');
      expect(result!.industry).toBe('SCHOOL');
    });

    it('should default to SCHOOL industry if not specified', async () => {
      prisma.accountingTemplate.findFirst.mockResolvedValue(null);
      await engine.getTemplate();
      expect(prisma.accountingTemplate.findFirst).toHaveBeenCalledWith({ where: { industry: 'SCHOOL' } });
    });
  });

  describe('seedSchoolTemplate', () => {
    it('should return existing template if it already exists', async () => {
      const existingTemplate = {
        id: 't-1', name: 'Existing', industry: 'SCHOOL', version: '1.0.0',
        structureDefinition: {}, ruleDefinitions: {}, metadata: {}, createdAt: new Date(),
      };
      prisma.accountingTemplate.findFirst.mockResolvedValue(existingTemplate);
      const result = await engine.seedSchoolTemplate();
      expect(result.id).toBe('t-1');
      expect(prisma.accountingTemplate.create).not.toHaveBeenCalled();
    });

    it('should create new template if none exists', async () => {
      prisma.accountingTemplate.findFirst.mockResolvedValue(null);
      const mockCreated = {
        id: 't-new', name: 'Standard School Template', industry: 'SCHOOL', version: '1.0.0',
        structureDefinition: {}, ruleDefinitions: {}, metadata: {}, createdAt: new Date(),
      };
      prisma.accountingTemplate.create.mockResolvedValue(mockCreated);

      const result = await engine.seedSchoolTemplate();
      expect(result.id).toBe('t-new');
      expect(prisma.accountingTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ industry: 'SCHOOL', version: '1.0.0' }),
      });
    });
  });
});
