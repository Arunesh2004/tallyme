export class VoucherXmlBuilderAdapter {
  /**
   * Adapts the relational AccountingVoucher into the generic Tally XML schema.
   * This represents the "XML Builder abstraction" expected by TallyConnector.
   */
  public static build(voucher: any): string {
    // In a real system, this would call out to specific XML builders
    // (ReceiptXmlBuilder, PaymentXmlBuilder, etc.) based on voucher.voucherType.
    // For this implementation, we build a canonical representation.
    
    let entriesXml = '';
    
    if (voucher.entries && Array.isArray(voucher.entries)) {
      for (const entry of voucher.entries) {
        entriesXml += `
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${entry.ledger?.name || 'UNKNOWN'}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>${entry.isDebit ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>
          <AMOUNT>${entry.isDebit ? '-' : ''}${entry.amount}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>`;
      }
    }

    // Formatting date to YYYYMMDD for Tally
    const d = new Date(voucher.date);
    const dateStr = d.toISOString().split('T')[0].replace(/-/g, '');

    const xml = `
<ENVELOPE>
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
          <VOUCHER VCHTYPE="${voucher.voucherType}" ACTION="Create">
            <DATE>${dateStr}</DATE>
            <VOUCHERTYPENAME>${voucher.voucherType}</VOUCHERTYPENAME>
            <NARRATION>${voucher.narration || ''}</NARRATION>
            ${entriesXml}
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

    return xml.trim();
  }
}
