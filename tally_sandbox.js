const http = require('http');
const fs = require('fs');

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

async function runSandbox() {
  console.log("=== TALLY PRIME SANDBOX ===");
  try {
        console.log(`\n--- Fetching Journal Register ---`);
        const fetchXml = `<ENVELOPE>
          <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
          <BODY>
            <EXPORTDATA>
              <REQUESTDESC>
                <REPORTNAME>Voucher Register</REPORTNAME>
                <STATICVARIABLES>
                  <SVCURRENTCOMPANY>Skyfall Legion Public School</SVCURRENTCOMPANY>
                  <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
                  <VOUCHERTYPENAME>Journal</VOUCHERTYPENAME>
                </STATICVARIABLES>
              </REQUESTDESC>
            </EXPORTDATA>
          </BODY>
        </ENVELOPE>`;
        const fetchRes = await sendTallyRequest(fetchXml);
        fs.writeFileSync('journal_register.xml', fetchRes.data);
        console.log("Wrote journal_register.xml. Length:", fetchRes.data.length);
        
        // Let's do a simple string search in the response
        if (fetchRes.data.includes('QA-')) {
            console.log("FOUND 'QA-' in journal register!");
        } else if (fetchRes.data.includes('500.00') || fetchRes.data.includes('500')) {
            console.log("Found 500 in journal register!");
        } else {
            console.log("No QA- or 500 found.");
        }
  } catch (e) {
    console.error(e);
  }
}

runSandbox();
