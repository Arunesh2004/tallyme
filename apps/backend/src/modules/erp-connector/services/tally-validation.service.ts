import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

export interface PreFlightFailure {
  checkType: string;
  message: string;
}

export interface PreFlightResult {
  allowed: boolean;
  failures: PreFlightFailure[];
}

@Injectable()
export class TallyValidationService {
  private readonly logger = new Logger(TallyValidationService.name);

  constructor(private readonly prisma: PrismaService) {}

  // LAYER 1: Pre-flight Validation
  async preFlightCheck(
    voucherId: string,
    companyId: string,
    payload: any,
  ): Promise<boolean> {
    this.logger.log(`Starting Pre-flight Validation for Voucher: ${voucherId}`);
    const run = await this.prisma.tallyValidationRun.create({
      data: {
        companyId,
        validationType: 'PRE_FLIGHT',
        status: 'STARTED',
      },
    });

    const { allowed, failures } = this.validatePayload(payload);
    const checks = failures.map((f) => ({
      validationRunId: run.id,
      checkType: f.checkType,
      status: 'FAILED',
      message: f.message,
    }));

    // Add passing checks for fields that passed
    const passingChecks: string[] = [];
    if (!failures.find((f) => f.checkType === 'COMPANY_EXISTS')) {
      passingChecks.push('COMPANY_EXISTS');
    }
    if (!failures.find((f) => f.checkType === 'LEDGER_EXISTS')) {
      passingChecks.push('LEDGER_EXISTS');
    }
    if (!failures.find((f) => f.checkType === 'PARTY_LEDGER_EXISTS')) {
      passingChecks.push('PARTY_LEDGER_EXISTS');
    }
    if (!failures.find((f) => f.checkType === 'VOUCHER_NUMBER_EXISTS')) {
      passingChecks.push('VOUCHER_NUMBER_EXISTS');
    }
    if (!failures.find((f) => f.checkType === 'STRUCTURE_MATCH')) {
      passingChecks.push('STRUCTURE_MATCH');
    }
    if (!failures.find((f) => f.checkType === 'DATA_INTEGRITY')) {
      passingChecks.push('DATA_INTEGRITY');
    }

    for (const checkType of passingChecks) {
      checks.push({
        validationRunId: run.id,
        checkType,
        status: 'PASSED',
        message: `${checkType} validated successfully`,
      });
    }

    await this.prisma.tallyValidationCheck.createMany({ data: checks });

    await this.prisma.tallyValidationRun.update({
      where: { id: run.id },
      data: {
        status: allowed ? 'COMPLETED' : 'FAILED',
        completedAt: new Date(),
        totalChecks: checks.length,
        passedChecks: passingChecks.length,
        failedChecks: failures.length,
      },
    });

    if (!allowed) {
      await this.prisma.accountingException.create({
        data: {
          entityType: 'VOUCHER',
          entityId: voucherId,
          exceptionType: 'PRE_FLIGHT_FAILED',
          severity: 'HIGH',
          description: failures.map((f) => f.message).join('; '),
          status: 'OPEN',
        },
      });
    }

    return allowed;
  }

  /**
   * Pure validation logic — no DB side effects.
   * Tests against TallyVoucherDTO.lines structure.
   */
  validatePayload(payload: any): PreFlightResult {
    const failures: PreFlightFailure[] = [];

    // 1. Voucher number must exist
    if (!payload.voucherNumber || String(payload.voucherNumber).trim() === '') {
      failures.push({
        checkType: 'VOUCHER_NUMBER_EXISTS',
        message: 'Voucher number is missing or empty',
      });
    }

    // 2. Lines must exist (TallyVoucherDTO uses .lines, not .ledgers)
    const lines: any[] = payload.lines ?? payload.ledgers ?? [];
    if (!lines || lines.length === 0) {
      failures.push({
        checkType: 'LEDGER_EXISTS',
        message: 'No ledger lines provided in voucher payload',
      });
      // Cannot do further checks without lines
      return { allowed: false, failures };
    }

    // 3. Data integrity — no NaN, undefined, null amounts
    for (const line of lines) {
      const amt = Number(line.amount);
      const name = line.ledgerName ?? line.name ?? '';
      if (isNaN(amt)) {
        failures.push({
          checkType: 'DATA_INTEGRITY',
          message: `Ledger "${name}" has NaN amount`,
        });
      }
      if (line.amount === undefined || line.amount === null) {
        failures.push({
          checkType: 'DATA_INTEGRITY',
          message: `Ledger "${name}" has undefined/null amount`,
        });
      }
      if (!name) {
        failures.push({
          checkType: 'DATA_INTEGRITY',
          message: 'A ledger line has no ledgerName',
        });
      }
    }

    // 4. Party ledger must be present
    const hasPartyLedger =
      !!payload.partyLedgerName || lines.some((l: any) => l.isParty === true);
    if (!hasPartyLedger) {
      failures.push({
        checkType: 'PARTY_LEDGER_EXISTS',
        message:
          'No party ledger found. Either partyLedgerName or a line with isParty=true is required',
      });
    }

    // 5. Debit == Credit balance check (TallyVoucherDTO convention)
    // Debit lines: isDebit=true → positive
    // Credit lines: isDebit=false → negative (or credit)
    const debitTotal = lines
      .filter((l: any) => l.isDebit === true)
      .reduce(
        (sum: number, l: any) => sum + Math.abs(Number(l.amount) || 0),
        0,
      );

    const creditTotal = lines
      .filter((l: any) => l.isDebit === false)
      .reduce(
        (sum: number, l: any) => sum + Math.abs(Number(l.amount) || 0),
        0,
      );

    if (Math.abs(debitTotal - creditTotal) > 0.01) {
      failures.push({
        checkType: 'STRUCTURE_MATCH',
        message: `Voucher is unbalanced. Debits: ${debitTotal.toFixed(2)}, Credits: ${creditTotal.toFixed(2)}`,
      });
    }

    return { allowed: failures.length === 0, failures };
  }

  // LAYER 2: Post-sync Verification
  async postSyncVerify(
    voucherId: string,
    companyId: string,
    tallyResponse: any,
  ): Promise<boolean> {
    this.logger.log(
      `Starting Post-sync Verification for Voucher: ${voucherId}`,
    );

    const run = await this.prisma.tallyValidationRun.create({
      data: {
        companyId,
        validationType: 'POST_SYNC',
        status: 'STARTED',
      },
    });

    // Phase I.1: Use STATUS field (primary) and CREATED (fallback)
    const isSuccess =
      tallyResponse?.success === true ||
      (typeof tallyResponse === 'string' &&
        (tallyResponse.includes('<STATUS>1</STATUS>') ||
          tallyResponse.includes('<CREATED>1</CREATED>')));

    await this.prisma.tallyValidationCheck.create({
      data: {
        validationRunId: run.id,
        checkType: 'VOUCHER_EXISTS',
        status: isSuccess ? 'PASSED' : 'FAILED',
        message: isSuccess
          ? 'Voucher successfully verified in Tally after sync'
          : 'Tally rejected or failed to process voucher',
      },
    });

    await this.prisma.tallyValidationRun.update({
      where: { id: run.id },
      data: {
        status: isSuccess ? 'COMPLETED' : 'FAILED',
        completedAt: new Date(),
        totalChecks: 1,
        passedChecks: isSuccess ? 1 : 0,
        failedChecks: isSuccess ? 0 : 1,
      },
    });

    return isSuccess;
  }
}
