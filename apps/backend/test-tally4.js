const http = require('http');

const xml = `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>CustomOpenCompanies</REPORTNAME>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        </STATICVARIABLES>
        <TDL>
          <TDLMESSAGE>
            <REPORT NAME="CustomOpenCompanies">
              <FORMS>CustomOpenCompanies</FORMS>
            </REPORT>
            <FORM NAME="CustomOpenCompanies">
              <PARTS>CustomOpenCompanies</PARTS>
            </FORM>
            <PART NAME="CustomOpenCompanies">
              <LINES>CustomOpenCompanies</LINES>
              <REPEAT>CustomOpenCompanies : Collection of Open Companies</REPEAT>
              <SCROLLED>Vertical</SCROLLED>
            </PART>
            <LINE NAME="CustomOpenCompanies">
              <FIELDS>CompanyName, CompanyGUID</FIELDS>
            </LINE>
            <FIELD NAME="CompanyName">
              <SET>$Name</SET>
              <XMLTAG>"COMPANYNAME"</XMLTAG>
            </FIELD>
            <FIELD NAME="CompanyGUID">
              <SET>$GUID</SET>
              <XMLTAG>"COMPANYGUID"</XMLTAG>
            </FIELD>
            <COLLECTION NAME="Collection of Open Companies">
              <TYPE>Company</TYPE>
            </COLLECTION>
          </TDLMESSAGE>
        </TDL>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;

const req = http.request(
  'http://localhost:9000',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml',
      'Content-Length': Buffer.byteLength(xml)
    }
  },
  (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('Response:', data));
  }
);

req.on('error', (e) => console.error('Error:', e));
req.write(xml);
req.end();
