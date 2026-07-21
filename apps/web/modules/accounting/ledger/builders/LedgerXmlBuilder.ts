import { create } from 'xmlbuilder2';
import { Ledger } from '../entities/Ledger';

export class LedgerXmlBuilder {
  /**
   * Converts a domain Ledger entity into Tally XML format.
   * @param ledger The validated Ledger entity
   * @param companyName Optional company name to target in Tally
   */
  public static build(ledger: Ledger, companyName: string = 'TallyMe Connect'): string {
    const root = create({ version: '1.0' })
      .ele('ENVELOPE')
        .ele('HEADER')
          .ele('TALLYREQUEST').txt('Import Data').up()
        .up()
        .ele('BODY')
          .ele('IMPORTDATA')
            .ele('REQUESTDESC')
              .ele('REPORTNAME').txt('All Masters').up()
              .ele('STATICVARIABLES')
                .ele('SVCURRENTCOMPANY').txt(companyName).up()
              .up()
            .up()
            .ele('REQUESTDATA')
              .ele('TALLYMESSAGE', { 'xmlns:UDF': 'TallyUDF' })
                .ele('LEDGER', { NAME: ledger.name, ACTION: 'Create' })
                  .ele('NAME').txt(ledger.name).up()
                  .ele('PARENT').txt(ledger.parentGroup).up();

    if (ledger.openingBalance > 0) {
      // In Tally Master XML, Debit is negative, Credit is positive
      const tallyAmount = ledger.openingBalanceType === 'Debit' ? -Math.abs(ledger.openingBalance) : Math.abs(ledger.openingBalance);
      root.ele('OPENINGBALANCE').txt(tallyAmount.toString()).up();
    }

    if (ledger.address) {
      root.ele('ADDRESS.LIST').ele('ADDRESS').txt(ledger.address).up().up();
    }
    if (ledger.country) root.ele('COUNTRYNAME').txt(ledger.country).up();
    if (ledger.state) root.ele('LEDSTATE').txt(ledger.state).up();
    if (ledger.pincode) root.ele('PINCODE').txt(ledger.pincode).up();
    if (ledger.phone) root.ele('LEDGERPHONE').txt(ledger.phone).up();
    if (ledger.email) root.ele('EMAIL').txt(ledger.email).up();
    if (ledger.pan) root.ele('INCOMETAXNUMBER').txt(ledger.pan).up();

    if (ledger.gstDetails) {
      if (ledger.gstDetails.registrationType) {
        root.ele('GSTREGISTRATIONTYPE').txt(ledger.gstDetails.registrationType).up();
      }
      if (ledger.gstDetails.gstin) {
        root.ele('PARTYGSTIN').txt(ledger.gstDetails.gstin).up();
      }
    }

    return root.end({ prettyPrint: false, headless: true });
  }
}
