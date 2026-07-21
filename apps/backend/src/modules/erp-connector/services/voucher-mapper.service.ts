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
      date:
        internalData.date ||
        new Date().toISOString().split('T')[0].replace(/-/g, ''), // Default format YYYYMMDD
      voucherType: internalData.voucherType || 'Receipt',
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
}
