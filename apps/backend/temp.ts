async function probeDate() {
  for (let year = 2020; year <= 2026; year++) {
    const dateStr = `${year}0401`;
    const xml = `<ENVELOPE>
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
              <VOUCHER VCHTYPE="Journal" ACTION="Create" OBJVIEW="Accounting Voucher View">
                <DATE>${dateStr}</DATE>
                <VOUCHERTYPENAME>Journal</VOUCHERTYPENAME>
                <VOUCHERNUMBER>PROBE-${year}</VOUCHERNUMBER>
                <PERSISTEDVIEW>Accounting Voucher View</PERSISTEDVIEW>
                <ALLLEDGERENTRIES.LIST>
                  <LEDGERNAME>Cash</LEDGERNAME>
                  <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                  <ISPARTYLEDGER>No</ISPARTYLEDGER>
                  <AMOUNT>-100</AMOUNT>
                </ALLLEDGERENTRIES.LIST>
                <ALLLEDGERENTRIES.LIST>
                  <LEDGERNAME>Bank Account</LEDGERNAME>
                  <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
                  <ISPARTYLEDGER>No</ISPARTYLEDGER>
                  <AMOUNT>100</AMOUNT>
                </ALLLEDGERENTRIES.LIST>
              </VOUCHER>
            </TALLYMESSAGE>
          </REQUESTDATA>
        </IMPORTDATA>
      </BODY>
    </ENVELOPE>`;

    try {
      const res = await fetch('http://localhost:9000', {
        method: 'POST',
        body: xml
      });
      const resText = await res.text();
      if (!resText.includes('Out of Range') && !resText.includes('Voucher date is missing')) {
        console.log(`Success! Date ${dateStr} is accepted. Response: ${resText}`);
        return;
      } else {
        console.log(`Failed for ${dateStr}`);
      }
    } catch (err) {
      console.error(err);
    }
  }
}

probeDate();
