import { describe, it, expect } from 'vitest';
import { VoucherXmlBuilder } from '../../../../modules/accounting/voucher/builders/VoucherXmlBuilder';
import { Voucher } from '../../../../modules/accounting/voucher/entities/Voucher';
import { VoucherType } from '../../../../modules/accounting/voucher/enums/VoucherType';

describe('VoucherXmlBuilder', () => {
  it('should generate exact Golden XML for a Sales Voucher', () => {
    const voucher: Voucher = {
      voucherType: VoucherType.Sales,
      date: '20230501',
      narration: 'Test Sales',
      ledgerEntries: [
        { ledgerName: 'Cash', amount: 100, isDeemedPositive: true },
        { ledgerName: 'Sales', amount: 100, isDeemedPositive: false }
      ]
    };

    const xml = VoucherXmlBuilder.build(voucher, 'TallyMe Connect');

    const expectedXml = '<ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME><STATICVARIABLES><SVCURRENTCOMPANY>TallyMe Connect</SVCURRENTCOMPANY></STATICVARIABLES></REQUESTDESC><REQUESTDATA><TALLYMESSAGE xmlns:UDF="TallyUDF"><VOUCHER VCHTYPE="Sales" ACTION="Create"><DATE>20230501</DATE><VOUCHERTYPENAME>Sales</VOUCHERTYPENAME><NARRATION>Test Sales</NARRATION><ALLLEDGERENTRIES.LIST><LEDGERNAME>Cash</LEDGERNAME><ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE><AMOUNT>-100</AMOUNT></ALLLEDGERENTRIES.LIST><ALLLEDGERENTRIES.LIST><LEDGERNAME>Sales</LEDGERNAME><ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE><AMOUNT>100</AMOUNT></ALLLEDGERENTRIES.LIST></VOUCHER></TALLYMESSAGE></REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>';
    
    expect(xml).toBe(expectedXml);
  });
});
