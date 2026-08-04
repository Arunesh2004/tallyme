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
      guid: internalData.id,
      date:
        (internalData.date instanceof Date
          ? internalData.date.toISOString().split('T')[0].replace(/-/g, '')
          : internalData.date) ||
        new Date().toISOString().split('T')[0].replace(/-/g, ''),
      voucherType: internalData.voucherType || 'Receipt',
      companyId: internalData.companyId,
      companyName: internalData.companyName,
      partyLedgerName: internalData.partyLedgerName,
      narration: internalData.narration,
      isEdit: internalData.isEdit || false,

      // Supplier / GST party details (Phase H.1)
      supplierGstin: internalData.supplierGstin,
      supplierPan: internalData.supplierPan,
      supplierState: internalData.supplierState,
      placeOfSupply: internalData.placeOfSupply,

      // Invoice metadata (Phase H.1)
      invoiceNumber: internalData.invoiceNumber,
      purchaseOrder: internalData.purchaseOrder,
      paymentTerms: internalData.paymentTerms,

      // GST tax totals (Phase H.1)
      cgst: internalData.cgst != null ? Number(internalData.cgst) : undefined,
      sgst: internalData.sgst != null ? Number(internalData.sgst) : undefined,
      igst: internalData.igst != null ? Number(internalData.igst) : undefined,
      cess: internalData.cess != null ? Number(internalData.cess) : undefined,

      lines:
        internalData.lines?.map((line: any) => ({
          ledgerName: line.ledgerName,
          stockItemName: line.stockItemName,
          isDebit: Boolean(line.isDebit),
          isParty: Boolean(line.isParty),
          amount: Number(line.amount),
          // Line-level inventory metadata (Phase H.1)
          hsnCode: line.hsnCode,
          quantity: line.quantity != null ? Number(line.quantity) : undefined,
          unit: line.unit,
          rate: line.rate != null ? Number(line.rate) : undefined,
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
