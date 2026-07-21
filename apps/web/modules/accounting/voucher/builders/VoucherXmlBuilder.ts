import { create } from 'xmlbuilder2';
import { Voucher } from '../entities/Voucher';

export class VoucherXmlBuilder {
  /**
   * Converts a domain Voucher entity into Tally XML format.
   * @param voucher The validated Voucher entity
   * @param companyName Optional company name to target in Tally
   */
  public static build(voucher: Voucher, companyName: string = 'TallyMe Connect'): string {
    const root = create({ version: '1.0' })
      .ele('ENVELOPE')
        .ele('HEADER')
          .ele('TALLYREQUEST').txt('Import Data').up()
        .up()
        .ele('BODY')
          .ele('IMPORTDATA')
            .ele('REQUESTDESC')
              .ele('REPORTNAME').txt('Vouchers').up()
              .ele('STATICVARIABLES')
                .ele('SVCURRENTCOMPANY').txt(companyName).up()
              .up()
            .up()
            .ele('REQUESTDATA')
              .ele('TALLYMESSAGE', { 'xmlns:UDF': 'TallyUDF' })
                .ele('VOUCHER', { VCHTYPE: voucher.voucherType, ACTION: 'Create' })
                  .ele('DATE').txt(voucher.date).up()
                  .ele('VOUCHERTYPENAME').txt(voucher.voucherType).up();

    if (voucher.narration) {
      root.ele('NARRATION').txt(voucher.narration).up();
    }

    if (voucher.reference) {
      root.ele('REFERENCE').txt(voucher.reference).up();
    }

    // Process Ledger Entries
    // Tally expects Debits to be negative amounts, Credits to be positive amounts.
    for (const entry of voucher.ledgerEntries) {
      const tallyAmount = entry.isDeemedPositive ? -Math.abs(entry.amount) : Math.abs(entry.amount);
      
      root.ele('ALLLEDGERENTRIES.LIST')
        .ele('LEDGERNAME').txt(entry.ledgerName).up()
        .ele('ISDEEMEDPOSITIVE').txt(entry.isDeemedPositive ? 'Yes' : 'No').up()
        .ele('AMOUNT').txt(tallyAmount.toString()).up()
      .up();
    }

    // Process Inventory Entries if they exist
    if (voucher.inventoryEntries && voucher.inventoryEntries.length > 0) {
      for (const inv of voucher.inventoryEntries) {
        root.ele('ALLINVENTORYENTRIES.LIST')
          .ele('STOCKITEMNAME').txt(inv.itemName).up()
          .ele('ISDEEMEDPOSITIVE').txt('Yes').up() // Typically inventory goes into stock
          .ele('RATE').txt(inv.rate ? inv.rate.toString() : '').up()
          .ele('AMOUNT').txt((-Math.abs(inv.amount)).toString()).up()
          .ele('BILLEDQTY').txt(inv.billedQuantity ? inv.billedQuantity.toString() : inv.quantity.toString()).up()
          .ele('ACTUALQTY').txt(inv.quantity.toString()).up()
        .up();
      }
    }

    // Tax entries mapped to ledgers
    if (voucher.taxEntries && voucher.taxEntries.length > 0) {
      for (const tax of voucher.taxEntries) {
        const tallyAmount = tax.isDeemedPositive ? -Math.abs(tax.taxAmount) : Math.abs(tax.taxAmount);
        root.ele('ALLLEDGERENTRIES.LIST')
          .ele('LEDGERNAME').txt(tax.taxLedgerName).up()
          .ele('ISDEEMEDPOSITIVE').txt(tax.isDeemedPositive ? 'Yes' : 'No').up()
          .ele('AMOUNT').txt(tallyAmount.toString()).up()
        .up();
      }
    }

    return root.end({ prettyPrint: false, headless: true });
  }
}
