const axios = require('axios');

async function testTallyXML() {
    console.log("==================================================");
    console.log("TALLY XML MINIMAL REPRODUCTION 3");
    console.log("==================================================");
    
    const minimalXml = `<ENVELOPE>
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
            <VOUCHERNUMBER>MIN-2024-TEST3</VOUCHERNUMBER>
            <CSTFORMISSUETYPE/>
            <CSTFORMRECVTYPE/>
            <FBTPAYMENTTYPE>Default</FBTPAYMENTTYPE>
            <PERSISTEDVIEW>Accounting Voucher View</PERSISTEDVIEW>
            <VCHGSTCLASS/>
            <DIFFACTUALQTY>No</DIFFACTUALQTY>
            <ISMSTFROMSYNC>No</ISMSTFROMSYNC>
            <ASORIGINAL>No</ASORIGINAL>
            <AUDITED>No</AUDITED>
            <FORJOBCOSTING>No</FORJOBCOSTING>
            <ISOPTIONAL>No</ISOPTIONAL>
            <EFFECTIVEDATE>20240601</EFFECTIVEDATE>
            <USEFORINTEREST>No</USEFORINTEREST>
            <USEFORGAINLOSS>No</USEFORGAINLOSS>
            <USEFORGODOWNTRANSFER>No</USEFORGODOWNTRANSFER>
            <USEFORCOMPOUND>No</USEFORCOMPOUND>
            <USEFORSERVICETAX>No</USEFORSERVICETAX>
            <EXCISEOPENING>No</EXCISEOPENING>
            <USEFORFINALPRODUCTION>No</USEFORFINALPRODUCTION>
            <ISCANCELLED>No</ISCANCELLED>
            <HASCASHFLOW>No</HASCASHFLOW>
            <ISPOSTDATED>No</ISPOSTDATED>
            <USETRACKINGNUMBER>No</USETRACKINGNUMBER>
            <ISINVOICE>No</ISINVOICE>
            <MFGJOURNAL>No</MFGJOURNAL>
            <HASDISCOUNTS>No</HASDISCOUNTS>
            <ASPAYSLIP>No</ASPAYSLIP>
            <ISCOSTCENTRE>No</ISCOSTCENTRE>
            <ISSTXNONREALIZEDVCH>No</ISSTXNONREALIZEDVCH>
            <ISBLANKCHEQUE>No</ISBLANKCHEQUE>
            <ISVOID>No</ISVOID>
            <ORDERLINESTATUS>No</ORDERLINESTATUS>
            <VATISAGNSTCANCSALES>No</VATISAGNSTCANCSALES>
            <VATISPURCEXEMPTED>No</VATISPURCEXEMPTED>
            <ISDELETED>No</ISDELETED>
            <CHANGEVCHMODE>No</CHANGEVCHMODE>
            <ALTERID>0</ALTERID>
            <MASTERID>0</MASTERID>
            <VOUCHERKEY>0</VOUCHERKEY>
            <EXCLUDEDTAXATIONS.LIST/>
            <OLDAUDITENTRIES.LIST/>
            <ACCOUNTAUDITENTRIES.LIST/>
            <AUDITENTRIES.LIST/>
            <DUTYHEADDETAILS.LIST/>
            <SUPPLEMENTARYDUTYHEADDETAILS.LIST/>
            <INVOICEDELNOTES.LIST/>
            <INVOICEORDERLIST.LIST/>
            <INVOICEINDENTLIST.LIST/>
            <ATTENDANCEENTRIES.LIST/>
            <ORIGINALINVOICEDETAILS.LIST/>
            <INVOICEEXPORTLIST.LIST/>
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
        console.log("Sending...");
        const res = await axios.post('http://localhost:9000', minimalXml, { headers: { 'Content-Type': 'text/xml' } });
        console.log("Response:");
        console.log(res.data.trim());
    } catch (e) {
        console.error("Connection failed:", e.message);
    }
}

testTallyXML();
