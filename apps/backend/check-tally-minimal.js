const axios = require('axios');

async function testTallyMinimalFY() {
    console.log("==================================================");
    console.log("MINIMAL TALLYPRIME HISTORICAL DATE VALIDATION");
    console.log("==================================================");
    
    // FY 2024-25 Date (01-Jun-2024)
    const payload2024 = `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>Skyfall Legion Public School</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Purchase" ACTION="Create">
            <DATE>20240601</DATE>
            <VOUCHERTYPENAME>Purchase</VOUCHERTYPENAME>
            <VOUCHERNUMBER>MIN-2024</VOUCHERNUMBER>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>SIDDHI BOOK DEPOT</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>10</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>TEST_VENDOR_EXPENSE</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-10</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

    try {
        console.log("Sending FY 2024-25 Voucher (01-06-2024)...");
        const res2024 = await axios.post('http://localhost:9000', payload2024, { headers: { 'Content-Type': 'text/xml' } });
        console.log("Response:");
        console.log(res2024.data.trim());
        
    } catch (e) {
        console.error("Connection failed:", e.message);
    }
}

testTallyMinimalFY();
