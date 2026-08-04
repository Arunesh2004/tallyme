const fetch = require('node-fetch');

async function exportVouchers() {
  const xmlReq = `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Voucher Register</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>Skyfall Legion Public School</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;

  try {
    const res = await fetch('http://localhost:9000', {
      method: 'POST',
      body: xmlReq
    });
    const text = await res.text();
    console.log(text);
  } catch(e) {
    console.error(e);
  }
}
exportVouchers();
