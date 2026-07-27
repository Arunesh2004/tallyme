import { Injectable } from '@nestjs/common';
import { validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { TallyVoucherDTO } from '../dto/tally-voucher.dto';
import { ERPValidationException } from '../exceptions/erp-validation.exception';

@Injectable()
export class VoucherMapperService {
  /**
   * Maps internal domain data to the ERP Transport Contract (TallyVoucherDTO)
   * and performs strict validation.
   */
  mapToTransport(internalData: any): TallyVoucherDTO {
    // 1. Map fields
    const dto = plainToInstance(TallyVoucherDTO, {
      voucherNumber: internalData.voucherNumber,
      date: this.formatDateForTally(internalData.date),
      voucherType: internalData.voucherType || 'Receipt',
      companyId: internalData.companyId,
      companyName: internalData.companyName,
      partyLedgerName: internalData.partyLedgerName,
      isEdit: internalData.isEdit || false,
      lines:
        internalData.lines?.map((line: any) => ({
          ledgerName: line.ledgerName,
          isDebit: Boolean(line.isDebit),
          isParty: Boolean(line.isParty),
          amount: Number(line.amount),
        })) || [],
    });

    // 2. Structural validation via class-validator
    const errors = validateSync(dto);
    if (errors.length > 0) {
      const messages = errors
        .map((e) => Object.values(e.constraints || {}).join(', '))
        .join('; ');
      throw new ERPValidationException(
        `Voucher transport validation failed: ${messages}`,
      );
    }

    // 3. Business rule validation: Balanced Accounting Entries
    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of dto.lines) {
      if (line.isDebit) {
        totalDebit += line.amount;
      } else {
        totalCredit += line.amount;
      }
    }

    // Floating point safe comparison for JS
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new ERPValidationException(
        `Voucher is unbalanced. Total Debits: ${totalDebit}, Total Credits: ${totalCredit}`,
      );
    }

    return dto;
  }

  /**
   * Formats a date to Tally Prime compatible format: DD-MM-YYYY
   * Tally Prime is strict about date format and will reject other formats.
   */
  private formatDateForTally(date: any): string {
    if (!date) {
      date = new Date();
    }

    const d = date instanceof Date ? date : new Date(date);

    // Validate date is a valid Date object
    if (isNaN(d.getTime())) {
      throw new ERPValidationException(
        `Invalid date provided: ${date}. Expected Date object or ISO string.`,
      );
    }

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}-${month}-${year}`;
  }
}
