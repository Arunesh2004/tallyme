const axios = require('axios');

async function checkTallyEnv() {
    console.log("==================================================");
    console.log("PHASE 1 - LICENSED TALLYPRIME ENVIRONMENT CHECK");
    console.log("==================================================");
    
    // Check connection by asking for Company Name
    const payload = `<ENVELOPE>
      <HEADER>
        <TALLYREQUEST>Export Data</TALLYREQUEST>
      </HEADER>
      <BODY>
        <EXPORTDATA>
          <REQUESTDESC>
            <REPORTNAME>List of Accounts</REPORTNAME>
            <STATICVARIABLES>
              <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
              <ACCOUNTTYPE>All Masters</ACCOUNTTYPE>
            </STATICVARIABLES>
          </REQUESTDESC>
        </EXPORTDATA>
      </BODY>
    </ENVELOPE>`;
    
    try {
        console.log("Sending XML request to http://localhost:9000...");
        const response = await axios.post('http://localhost:9000', payload, { headers: { 'Content-Type': 'text/xml' } });
        console.log("HTTP Status:", response.status);
        
        const match = /<SVCURRENTCOMPANY>([^<]+)<\/SVCURRENTCOMPANY>/i.exec(response.data);
        if (match) {
            console.log("Company Name:", match[1]);
        } else {
            console.log("Could not extract company name. Is Tally running a company?");
        }
        
        // Let's test the Educational Mode restriction by sending a dummy voucher on 2024-05-25
        console.log("\n==================================================");
        console.log("PHASE 2 - TALLYME CONNECTION TEST (Voucher Date Test)");
        console.log("==================================================");
        
        const testVoucherPayload = `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${match ? match[1] : 'Skyfall Legion Public School'}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Purchase" ACTION="Create">
            <DATE>20240525</DATE>
            <VOUCHERTYPENAME>Purchase</VOUCHERTYPENAME>
            <VOUCHERNUMBER>TEST-LIC-001</VOUCHERNUMBER>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Sundry Creditors</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>100</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>TEST_VENDOR_EXPENSE</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-100</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

        const testRes = await axios.post('http://localhost:9000', testVoucherPayload, { headers: { 'Content-Type': 'text/xml' } });
        console.log("Voucher Create HTTP Status:", testRes.status);
        console.log("Response:");
        console.log(testRes.data.trim());

    } catch (e) {
        console.error("Connection failed:", e.message);
    }
}

checkTallyEnv();
