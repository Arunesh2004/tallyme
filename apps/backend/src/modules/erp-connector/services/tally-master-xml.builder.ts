import { Injectable } from '@nestjs/common';
import { ConfigCompanyResolver } from './company-resolver.service';

@Injectable()
export class TallyMasterXmlBuilder {
  constructor(private readonly companyResolver: ConfigCompanyResolver) {}

  private escapeXml(unsafe: string | number | boolean): string {
    if (unsafe == null) return '';
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private async getStaticVariables(companyName?: string): Promise<string> {
    const resolvedName = await this.companyResolver.resolveCompanyName(companyName);
    if (!resolvedName) return '';
    return `<STATICVARIABLES>
          <SVCURRENTCOMPANY>${this.escapeXml(resolvedName)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>`;
  }

  async buildReadLedgersXml(companyName?: string): Promise<string> {
    return `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>List of Accounts</REPORTNAME>
        ${await this.getStaticVariables(companyName)}
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;
  }

  async buildCreateGroupXml(
    groupName: string,
    parentGroup: string = 'Sundry Creditors',
    companyName?: string,
  ): Promise<string> {
    return `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
        ${await this.getStaticVariables(companyName)}
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <GROUP NAME="${this.escapeXml(groupName)}" ACTION="Create">
            <NAME>${this.escapeXml(groupName)}</NAME>
            <PARENT>${this.escapeXml(parentGroup)}</PARENT>
            <ISADDABLE>Yes</ISADDABLE>
            <ISSUBLEDGER>No</ISSUBLEDGER>
          </GROUP>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
  }

  async buildCreateLedgerXml(
    ledgerName: string,
    parentGroup: string,
    companyName?: string,
  ): Promise<string> {
    return `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
        ${await this.getStaticVariables(companyName)}
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="${this.escapeXml(ledgerName)}" ACTION="Create">
            <NAME>${this.escapeXml(ledgerName)}</NAME>
            <PARENT>${this.escapeXml(parentGroup)}</PARENT>
            <ISBILLWISEON>Yes</ISBILLWISEON>
            <OPENINGBALANCE>0</OPENINGBALANCE>
          </LEDGER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
  }

  async buildCreateCostCategoryXml(
    categoryName: string,
    companyName?: string,
  ): Promise<string> {
    return `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
        ${await this.getStaticVariables(companyName)}
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <COSTCATEGORY NAME="${this.escapeXml(categoryName)}" ACTION="Create">
            <NAME>${this.escapeXml(categoryName)}</NAME>
            <ALLOCATEREVENUE>Yes</ALLOCATEREVENUE>
            <ALLOCATENONREVENUE>No</ALLOCATENONREVENUE>
          </COSTCATEGORY>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
  }

  async buildCreateCostCentreXml(
    costCentreName: string,
    categoryName: string,
    parentCostCentre?: string,
    companyName?: string,
  ): Promise<string> {
    return `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
        ${await this.getStaticVariables(companyName)}
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <COSTCENTRE NAME="${this.escapeXml(costCentreName)}" ACTION="Create">
            <NAME>${this.escapeXml(costCentreName)}</NAME>
            <CATEGORY>${this.escapeXml(categoryName)}</CATEGORY>
            ${parentCostCentre ? `<PARENT>${this.escapeXml(parentCostCentre)}</PARENT>` : ''}
          </COSTCENTRE>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
  }
}
