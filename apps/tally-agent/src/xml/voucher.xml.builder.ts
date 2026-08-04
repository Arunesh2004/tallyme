export interface VoucherData {
  voucherType: 'Purchase' | 'Receipt' | 'Journal' | 'Sales' | 'Payment';
  date: string; // YYYYMMDD
  partyLedger: string;
  amount: number;
  items?: any[];
  reference?: string;
  narration?: string;
}

export class VoucherXmlBuilder {
  static buildCreate(data: VoucherData, companyName: string = 'TallyMe Connect'): string {
    const { voucherType, date, partyLedger, amount, reference, narration } = data;

    return `<ENVELOPE>
      <HEADER>
        <TALLYREQUEST>Import Data</TALLYREQUEST>
      </HEADER>
      <BODY>
        <IMPORTDATA>
          <REQUESTDESC>
            <REPORTNAME>Vouchers</REPORTNAME>
            <STATICVARIABLES>
              <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
            </STATICVARIABLES>
          </REQUESTDESC>
          <REQUESTDATA>
            <TALLYMESSAGE xmlns:UDF="TallyUDF">
              <VOUCHER VCHTYPE="${voucherType}" ACTION="Create">
                <DATE>${date}</DATE>
                <VOUCHERTYPENAME>${voucherType}</VOUCHERTYPENAME>
                ${narration ? `<NARRATION>${narration}</NARRATION>` : ''}
                ${reference ? `<REFERENCE>${reference}</REFERENCE>` : ''}
                <ALLLEDGERENTRIES.LIST>
                  <LEDGERNAME>${partyLedger}</LEDGERNAME>
                  <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
                  <AMOUNT>${amount}</AMOUNT>
                </ALLLEDGERENTRIES.LIST>
                <ALLLEDGERENTRIES.LIST>
                  <LEDGERNAME>Suspense A/c</LEDGERNAME>
                  <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                  <AMOUNT>-${amount}</AMOUNT>
                </ALLLEDGERENTRIES.LIST>
              </VOUCHER>
            </TALLYMESSAGE>
          </REQUESTDATA>
        </IMPORTDATA>
      </BODY>
    </ENVELOPE>`.replace(/\n/g, '').replace(/\s{2,}/g, '');
  }
}
