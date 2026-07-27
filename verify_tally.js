const http = require('http');

const TALLY_HOST = '127.0.0.1';
const TALLY_PORT = 9000;

function sendTallyRequest(xmlPayload) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: TALLY_HOST,
      port: TALLY_PORT,
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
        'Content-Length': Buffer.byteLength(xmlPayload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    
    req.on('error', reject);
    req.write(xmlPayload);
    req.end();
  });
}

async function runVerification() {
  console.log("=== TALLY PRIME VERIFICATION ===");
  try {
    // 7. Create Test Voucher using valid ledgers
    console.log("\n[Step 7 & 8] Creating Test Voucher...");
    const qaVoucherNo = `QA-${Date.now()}`;
    const voucherXml = `<ENVELOPE>
      <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
      <BODY>
        <IMPORTDATA>
          <REQUESTDESC>
            <REPORTNAME>Vouchers</REPORTNAME>
          </REQUESTDESC>
          <REQUESTDATA>
            <TALLYMESSAGE xmlns:UDF="TallyUDF">
              <VOUCHER VCHTYPE="Journal" ACTION="Create">
                <DATE>20240510</DATE>
                <VOUCHERTYPENAME>Journal</VOUCHERTYPENAME>
                <VOUCHERNUMBER>${qaVoucherNo}</VOUCHERNUMBER>
                <NARRATION>QA Test Voucher creation via Integration</NARRATION>
                <ALLLEDGERENTRIES.LIST>
                  <LEDGERNAME>Cash</LEDGERNAME>
                  <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                  <AMOUNT>-500.00</AMOUNT>
                </ALLLEDGERENTRIES.LIST>
                <ALLLEDGERENTRIES.LIST>
                  <LEDGERNAME>Profit &amp; Loss A/c</LEDGERNAME>
                  <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
                  <AMOUNT>500.00</AMOUNT>
                </ALLLEDGERENTRIES.LIST>
              </VOUCHER>
            </TALLYMESSAGE>
          </REQUESTDATA>
        </IMPORTDATA>
      </BODY>
    </ENVELOPE>`;
    const createRes = await sendTallyRequest(voucherXml);
    console.log("Status:", createRes.status);
    console.log("Create Response:", createRes.data);
    
    // 9 & 10. Fetch the created voucher back
    if (createRes.data.includes('<CREATED>1</CREATED>')) {
        console.log("\n[Step 9 & 10] Reading Voucher Back...");
        const fetchXml = `<ENVELOPE>
          <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
          <BODY>
            <EXPORTDATA>
              <REQUESTDESC>
                <REPORTNAME>Voucher Register</REPORTNAME>
                <STATICVARIABLES>
                  <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                  <VOUCHERTYPENAME>Journal</VOUCHERTYPENAME>
                </STATICVARIABLES>
              </REQUESTDESC>
            </EXPORTDATA>
          </BODY>
        </ENVELOPE>`;
        const fetchRes = await sendTallyRequest(fetchXml);
        
        // Find if our voucher exists
        if (fetchRes.data.includes(qaVoucherNo)) {
            console.log(`Successfully fetched voucher ${qaVoucherNo} back!`);
        } else {
            console.log(`Could not find voucher ${qaVoucherNo} in response.`);
        }
    }

  } catch (err) {
    console.error("Verification Failed:", err.message);
  }
}

runVerification();
