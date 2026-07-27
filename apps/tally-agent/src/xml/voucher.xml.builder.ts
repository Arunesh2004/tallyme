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
  static buildCreate(data: VoucherData): string {
    const { voucherType, date, partyLedger, amount, reference, narration } = data;

    return `<ENVELOPE>
      <HEADER>
        <TALLYREQUEST>Import Data</TALLYREQUEST>
      </HEADER>
      <BODY>
        <IMPORTDATA>
          <REQUESTDESC>
            <REPORTNAME>Vouchers</REPORTNAME>
          </REQUESTDESC>
          <REQUESTDATA>
            <TALLYMESSAGE xmlns:UDF="TallyUDF">
              <VOUCHER VCHTYPE="${voucherType}" ACTION="Create">
                <DATE>${date}</DATE>
                <VOUCHERTYPENAME>${voucherType}</VOUCHERTYPENAME>
                <PARTYLEDGERNAME>${partyLedger}</PARTYLEDGERNAME>
                ${reference ? `<REFERENCE>${reference}</REFERENCE>` : ''}
                ${narration ? `<NARRATION>${narration}</NARRATION>` : ''}
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
