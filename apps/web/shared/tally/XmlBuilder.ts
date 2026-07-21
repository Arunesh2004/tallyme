import { create } from 'xmlbuilder2';
import { TallyVoucher } from './types/TallyDTOs';

export class XmlBuilder {
  static buildEnvelope(requestType: string, reportName: string, requestData: any): string {
    console.log('ENTER XmlBuilder.buildEnvelope');
    const doc = create({ version: '1.0' })
      .ele('ENVELOPE')
        .ele('HEADER')
          .ele('TALLYREQUEST').txt(requestType).up()
        .up()
        .ele('BODY')
          .ele('EXPORTDATA')
            .ele('REQUESTDESC')
              .ele('REPORTNAME').txt(reportName).up()
            .up()
            .ele('REQUESTDATA');
            
    console.log("Before import");
    // Parse raw XML string into xmlbuilder2 nodes, then import
    const parsedData = typeof requestData === 'string' ? create(requestData) : requestData;
    doc.import(parsedData);
    console.log("After import");

    doc.up()
          .up()
        .up()
      .up();
    return doc.end({ prettyPrint: false });
  }

  static buildVoucherEnvelope(voucherDto: TallyVoucher, companyName: string = 'TallyMe Connect'): string {
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
                .ele('VOUCHER', { VCHTYPE: voucherDto.voucherTypeName || voucherDto.voucherType, ACTION: 'Create' })
                  .ele('DATE').txt(voucherDto.date).up()
                  .ele('VOUCHERTYPENAME').txt(voucherDto.voucherTypeName || voucherDto.voucherType).up()
                  .ele('NARRATION').txt(voucherDto.narration || '').up();

    for (const ledger of voucherDto.ledgers) {
      root.ele('ALLLEDGERENTRIES.LIST')
        .ele('LEDGERNAME').txt(ledger.ledgerName).up()
        .ele('ISDEEMEDPOSITIVE').txt(ledger.isDeemedPositive ? 'Yes' : 'No').up()
        .ele('AMOUNT').txt(ledger.amount).up()
      .up();
    }

    return root.end({ prettyPrint: false });
  }

  static buildMasterXml(masterType: string, masterName: string): string {
    const doc = create().ele(masterType).ele('NAME').txt(masterName).up().up();
    return doc.end({ headless: true });
  }
}
