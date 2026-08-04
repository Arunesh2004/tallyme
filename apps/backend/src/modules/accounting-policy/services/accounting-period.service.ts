import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PeriodLockedException } from '../../../shared/exceptions/PeriodLockedException';
import { PeriodStatus, AccountingPeriod } from '@prisma/client';
import { AuditService } from '../../audit/audit.service';

@Injectable()
export class AccountingPeriodService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  public async createPeriod(companyId: string, name: string, startDate: Date, endDate: Date, userId: string): Promise<AccountingPeriod> {
    const p = await this.prisma.accountingPeriod.create({
      data: {
        companyId,
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      }
    });
    await this.audit.logEvent(userId, 'PERIOD_CREATED', { periodId: p.id, companyId });
    return p;
  }

  public async resolvePeriodForDate(companyId: string, targetDate: Date): Promise<AccountingPeriod | null> {
    return this.prisma.accountingPeriod.findFirst({
      where: {
        companyId,
        startDate: { lte: targetDate },
        endDate: { gte: targetDate },
      },
    });
  }

  public async validatePostingAllowed(companyId: string, targetDate: Date): Promise<void> {
    if (!companyId) throw new BadRequestException('Company ID is required for period validation');
    if (!targetDate) throw new BadRequestException('Target Date is required for period validation');

    const period = await this.resolvePeriodForDate(companyId, targetDate);

    if (!period) {
      throw new BadRequestException('No accounting period exists for the provided date');
    }

    if (period.status === PeriodStatus.LOCKED) {
      throw new PeriodLockedException(`The accounting period '${period.name}' is currently locked.`, period.id);
    }

    if (period.status === PeriodStatus.CLOSED) {
      throw new PeriodLockedException(`The accounting period '${period.name}' is definitively closed.`, period.id);
    }
  }

  public async lockPeriod(periodId: string, userId: string, reason?: string): Promise<AccountingPeriod> {
    const period = await this.prisma.accountingPeriod.findUnique({ where: { id: periodId } });
    if (!period) throw new NotFoundException('Accounting period not found');
    if (period.status === PeriodStatus.CLOSED) throw new ForbiddenException('Cannot lock a closed period');

    const updated = await this.prisma.$transaction(async (tx) => {
      const p = await tx.accountingPeriod.update({
        where: { id: periodId },
        data: {
          status: PeriodStatus.LOCKED,
          lockedBy: userId,
          lockedAt: new Date(),
        },
      });

      await tx.periodLockHistory.create({
        data: {
          accountingPeriodId: periodId,
          action: 'LOCKED',
          performedBy: userId,
          reason,
        },
      });

      return p;
    });

    await this.audit.logEvent(userId, 'PERIOD_LOCKED', { periodId, companyId: period.companyId, reason });
    return updated;
  }

  public async unlockPeriod(periodId: string, userId: string, reason?: string): Promise<AccountingPeriod> {
    const period = await this.prisma.accountingPeriod.findUnique({ where: { id: periodId } });
    if (!period) throw new NotFoundException('Accounting period not found');
    if (period.status === PeriodStatus.CLOSED) throw new ForbiddenException('Cannot unlock a closed period');

    const updated = await this.prisma.$transaction(async (tx) => {
      const p = await tx.accountingPeriod.update({
        where: { id: periodId },
        data: {
          status: PeriodStatus.OPEN,
          lockedBy: null,
          lockedAt: null,
        },
      });

      await tx.periodLockHistory.create({
        data: {
          accountingPeriodId: periodId,
          action: 'UNLOCKED',
          performedBy: userId,
          reason,
        },
      });

      return p;
    });

    await this.audit.logEvent(userId, 'PERIOD_UNLOCKED', { periodId, companyId: period.companyId, reason });
    return updated;
  }

  public async closePeriod(periodId: string, userId: string, reason?: string): Promise<AccountingPeriod> {
    const period = await this.prisma.accountingPeriod.findUnique({ where: { id: periodId } });
    if (!period) throw new NotFoundException('Accounting period not found');

    const updated = await this.prisma.$transaction(async (tx) => {
      const p = await tx.accountingPeriod.update({
        where: { id: periodId },
        data: {
          status: PeriodStatus.CLOSED,
          closedBy: userId,
          closedAt: new Date(),
        },
      });

      await tx.periodLockHistory.create({
        data: {
          accountingPeriodId: periodId,
          action: 'CLOSED',
          performedBy: userId,
          reason,
        },
      });

      return p;
    });

    await this.audit.logEvent(userId, 'PERIOD_CLOSED', { periodId, companyId: period.companyId, reason });
    return updated;
  }

  public async overrideLockedPeriod(periodId: string, userId: string, reason?: string): Promise<void> {
    const period = await this.prisma.accountingPeriod.findUnique({ where: { id: periodId } });
    if (!period) throw new NotFoundException('Accounting period not found');

    if (period.status === PeriodStatus.CLOSED) {
      throw new ForbiddenException('Definitively closed periods cannot be overridden.');
    }

    if (period.status !== PeriodStatus.LOCKED) {
      return; // Nothing to override
    }

    await this.prisma.periodLockHistory.create({
      data: {
        accountingPeriodId: periodId,
        action: 'OVERRIDE',
        performedBy: userId,
        reason,
      },
    });

    await this.audit.logEvent(userId, 'PERIOD_LOCK_OVERRIDDEN', { periodId, companyId: period.companyId, reason });
  }
}
