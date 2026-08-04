const axios = require('axios');

async function checkTallyConfig() {
    console.log("==================================================");
    console.log("VERIFYING TALLYPRIME INTERNAL CONFIGURATION (FORMULA)");
    console.log("==================================================");

    const payload = `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE>
            <!-- In Tally, we can evaluate a formula directly using EVALUATE -->
            <EVALUATE>##SVCurrentCompany</EVALUATE>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;

    try {
        console.log("Attempting EVALUATE...");
        const response = await axios.post('http://localhost:9000', payload, { headers: { 'Content-Type': 'text/xml' } });
        console.log(response.data.trim());
    } catch (e) {
        console.error("Attempt failed:", e.message);
        if(e.response) console.log(e.response.data);
    }
}

checkTallyConfig();
