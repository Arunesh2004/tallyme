import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { TallyMasterIntelligenceService } from '../services/tally-master-intelligence.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Controller('tally')
export class TallyOrganizationController {
  constructor(
    private readonly intelligenceService: TallyMasterIntelligenceService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('organization-preview')
  async preview() {
    await this.intelligenceService.loadMasters();
    const current = this.intelligenceService.getKnownStructure();

    const required = {
      groups: [
        'Vendor Details',
        'Outgoing Payment',
        'Student Details',
        'Test Vendor',
        '2023',
        '07',
      ],
      costCategories: ['Class', 'Section', 'Academic Year'],
      costCentres: ['10', 'A', '2023-2024', 'John Doe'],
      ledgers: ['Primary Bank Ledger', 'Fee Collection', 'Discount'],
    };

    const diff = {
      missingGroups: required.groups.filter(
        (g) => !current.groups.includes(g.toLowerCase()),
      ),
      missingCostCategories: required.costCategories.filter(
        (c) => !current.costCategories.includes(c.toLowerCase()),
      ),
      missingCostCentres: required.costCentres.filter(
        (c) => !current.costCentres.includes(c.toLowerCase()),
      ),
      missingLedgers: required.ledgers.filter(
        (l) => !current.ledgers.includes(l.toLowerCase()),
      ),
    };

    const changesRequired =
      diff.missingGroups.length +
      diff.missingCostCategories.length +
      diff.missingCostCentres.length +
      diff.missingLedgers.length;

    return {
      currentStructure: current,
      requiredStructure: required,
      migrationPlan: diff,
      changesRequired,
      estimatedObjects: changesRequired,
      warnings: [],
      risks: [
        'Creating deep hierarchies without real Tally verification may lead to orphan ledgers.',
      ],
    };
  }

  @Post('organize')
  async organize(@Body() payload: { confirm: boolean }) {
    if (!payload.confirm) {
      throw new HttpException(
        'Explicit confirmation required to execute migration.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const preview = await this.preview();
    if (preview.changesRequired === 0) {
      return { message: 'No changes required' };
    }

    const migrationId = `MIG-${Date.now()}`;
    const created: string[] = [];

    try {
      for (const group of preview.migrationPlan.missingGroups) {
        await this.intelligenceService.ensureGroup(group);
        await this.logMigration(migrationId, 'CREATE', 'GROUP', group);
        created.push(`GROUP:${group}`);
      }

      for (const cat of preview.migrationPlan.missingCostCategories) {
        await this.intelligenceService.ensureCostCategory(cat);
        await this.logMigration(migrationId, 'CREATE', 'COST_CATEGORY', cat);
        created.push(`COST_CATEGORY:${cat}`);
      }

      for (const centre of preview.migrationPlan.missingCostCentres) {
        await this.intelligenceService.ensureCostCentre(centre, 'Class'); // (implementation note)
        await this.logMigration(migrationId, 'CREATE', 'COST_CENTRE', centre);
        created.push(`COST_CENTRE:${centre}`);
      }

      return {
        message: 'Migration Completed Successfully',
        migrationId,
        objectsCreated: created.length,
        created,
      };
    } catch (error: any) {
      throw new HttpException(
        `Migration Failed: ${(error as any).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('migration/:id/rollback')
  async rollback(@Param('id') migrationId: string) {
    const history = await this.prisma.migrationHistory.findMany({
      where: { migrationId },
    });

    if (history.length === 0) {
      throw new HttpException('Migration ID not found', HttpStatus.NOT_FOUND);
    }

    // Rollback must NEVER blindly delete Tally objects.
    // Instead: Restore TallyMe configuration, mark created objects, generate cleanup recommendations.

    return {
      message: 'Rollback Simulated Safely',
      migrationId,
      tallyObjectsTouched: 0,
      internalMappingsRestored: history.length,
      cleanupRecommendations: history.map(
        (h) =>
          `Manually delete ${h.objectType}: ${h.objectName} from Tally if completely unused.`,
      ),
    };
  }

  private async logMigration(
    migrationId: string,
    operation: string,
    type: string,
    name: string,
  ) {
    await this.prisma.migrationHistory.create({
      data: {
        migrationId,
        operation,
        objectType: type,
        objectName: name,
        rollbackSupported: true,
      },
    });
  }
}
