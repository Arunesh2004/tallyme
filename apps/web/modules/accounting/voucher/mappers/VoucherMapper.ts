import { Voucher } from '../entities/Voucher';
import { CreateVoucherDTO } from '../dto/CreateVoucherDTO';

export class VoucherMapper {
  public static toEntity(dto: CreateVoucherDTO): Voucher {
    return {
      voucherType: dto.voucherType,
      // Ensure date is formatted as YYYYMMDD for Tally, or leave as is if we expect DTO to provide it.
      // Assuming DTO provides ISO or YYYY-MM-DD, we clean it.
      date: dto.date.replace(/-/g, ''), 
      effectiveDate: dto.effectiveDate ? dto.effectiveDate.replace(/-/g, '') : undefined,
      reference: dto.reference,
      referenceNumber: dto.referenceNumber,
      narration: dto.narration,
      ledgerEntries: dto.ledgerEntries.map(entry => ({
        ledgerName: entry.ledgerName,
        amount: entry.amount,
        isDeemedPositive: entry.isDeemedPositive
      })),
      inventoryEntries: dto.inventoryEntries?.map(entry => ({
        itemName: entry.itemName,
        quantity: entry.quantity,
        rate: entry.rate,
        amount: entry.amount,
        billedQuantity: entry.billedQuantity
      })),
      taxEntries: dto.taxEntries?.map(entry => ({
        taxLedgerName: entry.taxLedgerName,
        taxAmount: entry.taxAmount,
        isDeemedPositive: entry.isDeemedPositive
      })),
      attachments: dto.attachments,
      metadata: dto.metadata
    };
  }
}
