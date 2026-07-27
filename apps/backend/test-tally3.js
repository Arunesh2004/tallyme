const http = require('http');

const xml = `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>List of Companies</REPORTNAME><STATICVARIABLES>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        </STATICVARIABLES>
        <TDL>
          <TDLMESSAGE>
            <REPORT NAME="List of Companies" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No">
              <FORMS>List of Companies</FORMS>
            </REPORT>
            <FORM NAME="List of Companies" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No">
              <PARTS>List of Companies</PARTS>
            </FORM>
            <PART NAME="List of Companies" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No">
              <LINES>List of Companies</LINES>
              <REPEAT>List of Companies : Collection of Open Companies</REPEAT>
              <SCROLLED>Vertical</SCROLLED>
            </PART>
            <LINE NAME="List of Companies" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No">
              <FIELDS>CompanyName, CompanyGUID</FIELDS>
            </LINE>
            <FIELD NAME="CompanyName" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No">
              <SET>$Name</SET>
              <XMLTAG>"COMPANYNAME"</XMLTAG>
            </FIELD>
            <FIELD NAME="CompanyGUID" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No">
              <SET>$GUID</SET>
              <XMLTAG>"COMPANYGUID"</XMLTAG>
            </FIELD>
            <COLLECTION NAME="Collection of Open Companies" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No">
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
