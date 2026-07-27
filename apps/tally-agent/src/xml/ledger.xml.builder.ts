export interface LedgerData {
  name: string;
  group: string;
  gstin?: string;
  address?: string[];
}

export class LedgerXmlBuilder {
  static buildCreate(data: LedgerData): string {
    const { name, group, gstin, address } = data;

    const addressXml = address && address.length > 0 
      ? `<MAILINGNAME.LIST><TYPE>String</TYPE><MAILINGNAME>${name}</MAILINGNAME></MAILINGNAME.LIST>` + 
        address.map(a => `<ADDRESS.LIST><TYPE>String</TYPE><ADDRESS>${a}</ADDRESS></ADDRESS.LIST>`).join('')
      : '';

    const gstinXml = gstin ? `<PARTYGSTIN>${gstin}</PARTYGSTIN>` : '';

    return `<ENVELOPE>
      <HEADER>
        <TALLYREQUEST>Import Data</TALLYREQUEST>
      </HEADER>
      <BODY>
        <IMPORTDATA>
          <REQUESTDESC>
            <REPORTNAME>All Masters</REPORTNAME>
          </REQUESTDESC>
          <REQUESTDATA>
            <TALLYMESSAGE xmlns:UDF="TallyUDF">
              <LEDGER NAME="${name}" ACTION="Create">
                <NAME.LIST>
                  <TYPE>String</TYPE>
                  <NAME>${name}</NAME>
                </NAME.LIST>
                <PARENT>${group}</PARENT>
                <ISBILLWISEON>Yes</ISBILLWISEON>
                ${addressXml}
                ${gstinXml}
              </LEDGER>
            </TALLYMESSAGE>
          </REQUESTDATA>
        </IMPORTDATA>
      </BODY>
    </ENVELOPE>`.replace(/\n/g, '').replace(/\s{2,}/g, '');
  }
}
