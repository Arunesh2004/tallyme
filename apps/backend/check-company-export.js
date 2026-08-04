const axios = require('axios');

async function extractCompanyConfig() {
    const payload = `<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>List of Accounts</REPORTNAME>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
          <ACCOUNTTYPE>Companies</ACCOUNTTYPE>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;

    try {
        const res = await axios.post('http://localhost:9000', payload, { headers: { 'Content-Type': 'text/xml' } });
        console.log(res.data.trim());
    } catch (e) {
        console.log("Failed:", e.message);
    }
}

extractCompanyConfig();
