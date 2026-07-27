import { Injectable } from '@nestjs/common';
import { TallyVoucherDTO } from '../dto/tally-voucher.dto';

import { ConfigCompanyResolver } from './company-resolver.service';

@Injectable()
export class TallyXmlBuilderService {
  constructor(private readonly companyResolver: ConfigCompanyResolver) {}

  /**
   * Escapes special characters in XML strings to prevent invalid XML syntax.
   */
  private escapeXml(unsafe: string | number | boolean): string {
    if (unsafe == null) return '';
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Builds a Tally Prime compatible XML import payload for a voucher.
   */
  async buildVoucherXml(voucherData: TallyVoucherDTO): Promise<string> {
    const isEdit = voucherData.isEdit ? 'Yes' : 'No';

    // Tally requires VOUCHER node to specify action if it's new/alter
    // but typically standard import works.
    let xml = `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${this.escapeXml(await this.companyResolver.resolveCompanyName(voucherData.companyId))}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="${this.escapeXml(voucherData.voucherType)}" ACTION="${isEdit === 'Yes' ? 'Alter' : 'Create'}">
            <DATE>${this.escapeXml(voucherData.date)}</DATE>
            <VOUCHERTYPENAME>${this.escapeXml(voucherData.voucherType)}</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${this.escapeXml(voucherData.voucherNumber)}</VOUCHERNUMBER>
            ${
              voucherData.partyLedgerName
                ? `<PARTYLEDGERNAME>${this.escapeXml(voucherData.partyLedgerName)}</PARTYLEDGERNAME>`
                : ''
            }
            ${
              voucherData.narration
                ? `<NARRATION>${this.escapeXml(voucherData.narration)}</NARRATION>`
                : ''
            }
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
            <EFFECTIVEDATE>${this.escapeXml(voucherData.date)}</EFFECTIVEDATE>
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
            <INVOICEEXPORTLIST.LIST/>`;

    // Process each line as ALLLEDGERENTRIES.LIST
    for (const line of voucherData.lines) {
      const amountSign = line.isDebit ? '-' : '';
      xml += `
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${this.escapeXml(line.ledgerName)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>${line.isDebit ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>
              <LEDGERFROMITEM>No</LEDGERFROMITEM>
              <REMOVEZEROENTRIES>No</REMOVEZEROENTRIES>
              <ISPARTYLEDGER>${line.isParty ? 'Yes' : 'No'}</ISPARTYLEDGER>
              <ISLASTDEEMEDPOSITIVE>${line.isDebit ? 'Yes' : 'No'}</ISLASTDEEMEDPOSITIVE>
              <ISCAPITALGOODS>No</ISCAPITALGOODS>
              <AMOUNT>${amountSign}${this.escapeXml(line.amount)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>`;
    }

    xml += `
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

    require('fs').writeFileSync('tally_debug.xml', xml);
    return xml;
  }

  /**
   * Builds a Tally Prime compatible XML export payload to verify if a voucher exists.
   */
  async buildExportXml(voucherNumber: string, companyId?: string): Promise<string> {
    const safeCompany = this.escapeXml(
      await this.companyResolver.resolveCompanyName(companyId),
    );
    const safeVoucher = this.escapeXml(voucherNumber);

    return `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Voucher Register</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${safeCompany}</SVCURRENTCOMPANY>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
          <VOUCHERNO>${safeVoucher}</VOUCHERNO>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;
  }
}
