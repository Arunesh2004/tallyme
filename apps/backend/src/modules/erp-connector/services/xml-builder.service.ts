import { Injectable } from '@nestjs/common';
import { TallyVoucherDTO } from '../dto/tally-voucher.dto';

import { ICompanyResolver } from './company-resolver.service';

@Injectable()
export class TallyXmlBuilderService {
  constructor(private readonly companyResolver: ICompanyResolver) {}

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
  buildVoucherXml(voucherData: TallyVoucherDTO): string {
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
        ${
          this.companyResolver.resolveCompanyName(voucherData.companyName)
            ? `<STATICVARIABLES>
          <SVCURRENTCOMPANY>${this.escapeXml(this.companyResolver.resolveCompanyName(voucherData.companyName))}</SVCURRENTCOMPANY>
        </STATICVARIABLES>`
            : ''
        }
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="${this.escapeXml(voucherData.voucherType || 'Receipt')}" ACTION="Create" OBJVIEW="Accounting Voucher View">
            <DATE>${this.escapeXml(voucherData.date || '')}</DATE>
            <VOUCHERTYPENAME>${this.escapeXml(voucherData.voucherType || 'Receipt')}</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${this.escapeXml(voucherData.voucherNumber || '')}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${this.escapeXml(voucherData.partyLedgerName || '')}</PARTYLEDGERNAME>
            <PERSISTEDVIEW>Accounting Voucher View</PERSISTEDVIEW>
            ${voucherData.narration ? `<NARRATION>${this.escapeXml(voucherData.narration)}</NARRATION>` : ''}
`;

    // Process Ledger Entries
    if (Array.isArray(voucherData.lines)) {
      for (const line of voucherData.lines) {
        xml += `
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${this.escapeXml(line.ledgerName || '')}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>${line.isDebit ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>
              <LEDGERFROMITEM>No</LEDGERFROMITEM>
              <REMOVEZEROENTRIES>No</REMOVEZEROENTRIES>
              <ISPARTYLEDGER>${line.isParty ? 'Yes' : 'No'}</ISPARTYLEDGER>
              <AMOUNT>${line.isDebit ? '-' : ''}${this.escapeXml(line.amount || 0)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>`;
      }
    }

    xml += `
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

    return xml;
  }

  /**
   * Builds a Tally Prime compatible XML export payload to verify if a voucher exists.
   */
  buildExportXml(voucherNumber: string, companyName?: string): string {
    const safeCompany = this.escapeXml(
      this.companyResolver.resolveCompanyName(companyName),
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
          ${this.companyResolver.resolveCompanyName(companyName) ? `<SVCURRENTCOMPANY>${safeCompany}</SVCURRENTCOMPANY>` : ''}
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
          <VOUCHERNO>${safeVoucher}</VOUCHERNO>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;
  }
}
