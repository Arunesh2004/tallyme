// src/infrastructure/erp/tally/tally-xml.builder.ts
import { Injectable } from '@nestjs/common';
import { VoucherCandidate } from '../../../modules/vendor-slip/domain/services/voucher.service';

@Injectable()
export class TallyXMLBuilder {
  buildVoucher(candidate: VoucherCandidate): string {
    // Escaping would happen here
    const narration = candidate.narration
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    let ledgersXml = '';
    for (const entry of candidate.entries) {
      const ledgerName = entry.ledgerName
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      const amount = entry.isDebit
        ? `-${entry.amount.toNumber()}`
        : entry.amount.toNumber();

      ledgersXml += `
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${ledgerName}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>${entry.isDebit ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>
          <AMOUNT>${amount}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
      `;
    }

    return `
      <ENVELOPE>
        <HEADER>
          <TALLYREQUEST>Import Data</TALLYREQUEST>
        </HEADER>
        <BODY>
          <IMPORTDATA>
            <REQUESTDESC>
              <REPORTNAME>Vouchers</REPORTNAME>
            </REQUESTDESC>
            <REQUESTDATA>
              <TALLYMESSAGE xmlns:UDF="TallyUDF">
                <VOUCHER VCHTYPE="${candidate.voucherType}" ACTION="Create">
                  <DATE>${this.formatDate(candidate.date)}</DATE>
                  <VOUCHERTYPENAME>${candidate.voucherType}</VOUCHERTYPENAME>
                  <NARRATION>${narration}</NARRATION>
                  ${ledgersXml}
                </VOUCHER>
              </TALLYMESSAGE>
            </REQUESTDATA>
          </IMPORTDATA>
        </BODY>
      </ENVELOPE>
    `;
  }

  private formatDate(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`; // Tally expects YYYYMMDD
  }
}
