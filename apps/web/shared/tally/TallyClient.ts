import { TallyTransport } from './TallyTransport';
import { XmlBuilder } from './XmlBuilder';
import { XmlParser } from './XmlParser';
import { TallyCompany, TallyLedger, TallyVoucherType, TallyVoucher } from './types/TallyDTOs';

export class TallyClient {
  constructor(private transport: TallyTransport) {}

  // ---------------------------------------------------------
  // READ OPERATIONS (Infrastructure primitives only)
  // ---------------------------------------------------------

  public async getCompany(): Promise<TallyCompany[]> {
    const xml = `<ENVELOPE>
      <HEADER>
        <VERSION>1</VERSION>
        <TALLYREQUEST>Export</TALLYREQUEST>
        <TYPE>Collection</TYPE>
        <ID>List of Companies</ID>
      </HEADER>
      <BODY>
        <DESC>
          <STATICVARIABLES>
            <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
          </STATICVARIABLES>
          <TDL>
            <TDLMESSAGE>
              <COLLECTION NAME="List of Companies" ISINITIALIZE="Yes">
                <TYPE>Company</TYPE>
                <NATIVEMETHOD>Name</NATIVEMETHOD>
              </COLLECTION>
            </TDLMESSAGE>
          </TDL>
        </DESC>
      </BODY>
    </ENVELOPE>`;
    const rawResponse = await this.transport.send(xml);
    return XmlParser.parseCollection(rawResponse, 'COMPANY');
  }

  public async getLedgers(): Promise<TallyLedger[]> {
    const xml = `<ENVELOPE>
      <HEADER>
        <TALLYREQUEST>Export Data</TALLYREQUEST>
      </HEADER>
      <BODY>
        <EXPORTDATA>
          <REQUESTDESC>
            <REPORTNAME>List of Accounts</REPORTNAME>
            <STATICVARIABLES>
              <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
              <ACCOUNTTYPE>Ledgers</ACCOUNTTYPE>
            </STATICVARIABLES>
          </REQUESTDESC>
        </EXPORTDATA>
      </BODY>
    </ENVELOPE>`;
    const rawResponse = await this.transport.send(xml);
    return XmlParser.parseCollection(rawResponse, 'LEDGER');
  }

  public async getGroups(): Promise<any[]> {
    const xml = XmlBuilder.buildEnvelope('Export Data', 'List of Accounts', '<GROUP></GROUP>');
    const rawResponse = await this.transport.send(xml);
    return XmlParser.parseCollection(rawResponse, 'GROUP');
  }

  public async getVoucherTypes(): Promise<TallyVoucherType[]> {
    const xml = `<ENVELOPE>
      <HEADER>
        <TALLYREQUEST>Export Data</TALLYREQUEST>
      </HEADER>
      <BODY>
        <EXPORTDATA>
          <REQUESTDESC>
            <REPORTNAME>List of Accounts</REPORTNAME>
            <STATICVARIABLES>
              <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
              <ACCOUNTTYPE>Voucher Types</ACCOUNTTYPE>
            </STATICVARIABLES>
          </REQUESTDESC>
        </EXPORTDATA>
      </BODY>
    </ENVELOPE>`;
    const rawResponse = await this.transport.send(xml);
    return XmlParser.parseCollection(rawResponse, 'VOUCHERTYPE');
  }

  public async readMasters(accountType: string, nodeName: string): Promise<any[]> {
    const xml = `<ENVELOPE>
      <HEADER>
        <TALLYREQUEST>Export Data</TALLYREQUEST>
      </HEADER>
      <BODY>
        <EXPORTDATA>
          <REQUESTDESC>
            <REPORTNAME>List of Accounts</REPORTNAME>
            <STATICVARIABLES>
              <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
              <ACCOUNTTYPE>${accountType}</ACCOUNTTYPE>
            </STATICVARIABLES>
          </REQUESTDESC>
        </EXPORTDATA>
      </BODY>
    </ENVELOPE>`;
    const rawResponse = await this.transport.send(xml);
    return XmlParser.parseCollection(rawResponse, nodeName);
  }

  // ---------------------------------------------------------
  // WRITE OPERATIONS
  // ---------------------------------------------------------

  public async sendXml(rawXml: string): Promise<any> {
    const response = await this.transport.send(rawXml);
    return XmlParser.parseResponse(response);
  }

  public async createVoucher(voucherDto: TallyVoucher): Promise<any> {
    const envelope = XmlBuilder.buildVoucherEnvelope(voucherDto);
    const response = await this.transport.send(envelope);
    return XmlParser.parseResponse(response);
  }
}
