import { Injectable } from '@nestjs/common';
import { TallyVoucherDTO, TallyLedgerEntryDTO } from '../dto/tally-voucher.dto';
import { ConfigCompanyResolver } from './company-resolver.service';

// GST ledger name patterns (case-insensitive partial match)
const GST_LEDGER_PATTERNS: Record<string, string> = {
  cgst: 'CGST',
  sgst: 'SGST',
  igst: 'IGST',
  cess: 'Cess',
};

interface XmlValidationResult {
  valid: boolean;
  errors: string[];
}

@Injectable()
export class TallyXmlBuilderService {
  constructor(private readonly companyResolver: ConfigCompanyResolver) {}

  // ─────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────

  /**
   * Escapes special characters in XML strings to prevent invalid XML syntax.
   */
  private escapeXml(
    unsafe: string | number | boolean | null | undefined,
  ): string {
    if (
      unsafe == null ||
      unsafe === '' ||
      (typeof unsafe === 'number' && isNaN(unsafe))
    ) {
      return '';
    }
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Formats a numeric amount for Tally:
   * - Debit: positive number (Tally uses negative for credits in ALLLEDGERENTRIES)
   * - Credit: negative
   */
  private formatAmount(amount: number, isDebit: boolean): string {
    const abs = Math.abs(amount);
    return isDebit ? `-${abs}` : `${abs}`;
  }

  /**
   * Determines if a ledger line is an inventory/stock item line
   * (has HSN or quantity data).
   */
  private isInventoryLine(line: TallyLedgerEntryDTO): boolean {
    return !!(line.hsnCode || (line.quantity != null && line.quantity > 0));
  }

  /**
   * Determines if a ledger name matches a GST pattern.
   */
  private getGstType(ledgerName: string): string | null {
    const lower = ledgerName.toLowerCase();
    for (const [key, label] of Object.entries(GST_LEDGER_PATTERNS)) {
      if (lower.includes(key)) return label;
    }
    return null;
  }

  /**
   * Builds the narration string.
   * Uses existing narration if provided; otherwise auto-generates from invoice number.
   */
  private buildNarration(voucher: TallyVoucherDTO): string {
    if (voucher.narration) return voucher.narration;
    const inv = voucher.invoiceNumber || voucher.voucherNumber;
    return `Purchase Invoice ${inv}`;
  }

  // ─────────────────────────────────────────────
  // VALIDATION
  // ─────────────────────────────────────────────

  /**
   * Pre-XML safety validation. Throws on any critical failure.
   */
  private validateVoucher(voucher: TallyVoucherDTO): XmlValidationResult {
    const errors: string[] = [];

    // 1. Voucher number must exist
    if (!voucher.voucherNumber || voucher.voucherNumber.trim() === '') {
      errors.push('Voucher number is missing');
    }

    // 2. Must have at least 2 lines
    if (!voucher.lines || voucher.lines.length < 2) {
      errors.push('Voucher must have at least 2 ledger lines');
    }

    if (voucher.lines && voucher.lines.length >= 2) {
      // 3. Debit == Credit check
      let totalDebit = 0;
      let totalCredit = 0;
      for (const line of voucher.lines) {
        if (line.amount == null || isNaN(line.amount)) {
          errors.push(`Line "${line.ledgerName}" has invalid amount`);
          continue;
        }
        if (line.isDebit) totalDebit += line.amount;
        else totalCredit += line.amount;
      }
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        errors.push(
          `Voucher is unbalanced. Debits: ${totalDebit.toFixed(2)}, Credits: ${totalCredit.toFixed(2)}`,
        );
      }

      // 4. Vendor ledger must exist for Purchase type
      if (voucher.voucherType?.toLowerCase().includes('purchase')) {
        const hasPartyLedger =
          voucher.lines.some((l) => l.isParty) || !!voucher.partyLedgerName;
        if (!hasPartyLedger) {
          errors.push('Purchase voucher must have a vendor/party ledger');
        }
      }

      // 5. No undefined/null/NaN ledger names
      for (const line of voucher.lines) {
        if (!line.ledgerName || line.ledgerName.trim() === '') {
          errors.push('A ledger line has an empty ledger name');
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // ─────────────────────────────────────────────
  // XML SECTION BUILDERS
  // ─────────────────────────────────────────────

  /**
   * Builds the ALLLEDGERENTRIES.LIST XML block for a single ledger line.
   * Supports GST ledger detection and party ledger tagging.
   */
  private buildLedgerEntryXml(line: TallyLedgerEntryDTO, voucher: TallyVoucherDTO): string {
    const gstType = this.getGstType(line.ledgerName);
    const amount = this.formatAmount(line.amount, line.isDebit);
    const gstNodes = '';

    let billAllocations = '';
    if (line.isParty) {
      const billName = this.escapeXml(voucher.invoiceNumber || voucher.voucherNumber);
      billAllocations = `
              <BILLALLOCATIONS.LIST>
                <NAME>${billName}</NAME>
                <BILLTYPE>New Ref</BILLTYPE>
                <AMOUNT>${this.escapeXml(amount)}</AMOUNT>
              </BILLALLOCATIONS.LIST>`;
    }

    return `
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${this.escapeXml(line.ledgerName)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>${line.isDebit ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>
              <LEDGERFROMITEM>No</LEDGERFROMITEM>
              <REMOVEZEROENTRIES>No</REMOVEZEROENTRIES>
              <ISPARTYLEDGER>${line.isParty ? 'Yes' : 'No'}</ISPARTYLEDGER>
              <ISLASTDEEMEDPOSITIVE>${line.isDebit ? 'Yes' : 'No'}</ISLASTDEEMEDPOSITIVE>
              <ISCAPITALGOODS>No</ISCAPITALGOODS>${gstNodes}${billAllocations}
              <AMOUNT>${this.escapeXml(amount)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>`;
  }

  /**
   * Builds INVENTORYENTRIES.LIST XML block for a line with stock item data.
   */
  private buildInventoryEntryXml(line: TallyLedgerEntryDTO): string {
    const qty = line.quantity ?? 1;
    const unit = this.escapeXml(line.unit || 'Nos');
    const rate = this.escapeXml(line.rate ?? line.amount);
    const hsnCode = this.escapeXml(line.hsnCode || '');
    const stockName = this.escapeXml(line.stockItemName || line.ledgerName);
    const ledgerName = this.escapeXml(line.ledgerName);
    const accountingAmount = this.formatAmount(line.amount, line.isDebit);
    // In Tally, Inventory Amount is POSITIVE for Inward (Debit) and NEGATIVE for Outward (Credit).
    // This is the opposite of the Accounting Amount polarity.
    const inventoryAmount = line.isDebit ? Math.abs(line.amount) : -Math.abs(line.amount);

    return `
            <INVENTORYENTRIES.LIST>
              <STOCKITEMNAME>${stockName}</STOCKITEMNAME>
              <ISDEEMEDPOSITIVE>${line.isDebit ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>
              <ISLASTDEEMEDPOSITIVE>${line.isDebit ? 'Yes' : 'No'}</ISLASTDEEMEDPOSITIVE>
              <ISAUTONEGATE>No</ISAUTONEGATE>
              <HSNCODE>${hsnCode}</HSNCODE>
              <GSTOVRDNTYPE/>
              <GSTOVRDNRATE/>
              <GSTOVRDNHSNCODE/>
              <BILLEDQTY>${this.escapeXml(qty)} ${unit}</BILLEDQTY>
              <ACTUALQTY>${this.escapeXml(qty)} ${unit}</ACTUALQTY>
              <RATE>${rate}/${unit}</RATE>
              <AMOUNT>${this.escapeXml(inventoryAmount)}</AMOUNT>
              <BATCHALLOCATIONS.LIST/>
              <ACCOUNTINGALLOCATIONS.LIST>
                <LEDGERNAME>${ledgerName}</LEDGERNAME>
                <ISDEEMEDPOSITIVE>${line.isDebit ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>
                <AMOUNT>${this.escapeXml(accountingAmount)}</AMOUNT>
              </ACCOUNTINGALLOCATIONS.LIST>
            </INVENTORYENTRIES.LIST>`;
  }

  /**
   * Builds optional GST party details block.
   */
  private buildGstDetailsXml(voucher: TallyVoucherDTO): string {
    const parts: string[] = [];

    if (voucher.supplierGstin) {
      parts.push(
        `<PARTYGSTIN>${this.escapeXml(voucher.supplierGstin)}</PARTYGSTIN>`,
      );
      parts.push(
        `<SUPPLIERGSTIN>${this.escapeXml(voucher.supplierGstin)}</SUPPLIERGSTIN>`,
      );
    }
    if (voucher.supplierState) {
      parts.push(
        `<STATENAME>${this.escapeXml(voucher.supplierState)}</STATENAME>`,
      );
    }
    if (voucher.placeOfSupply) {
      parts.push(
        `<PLACEOFSUPPLY>${this.escapeXml(voucher.placeOfSupply)}</PLACEOFSUPPLY>`,
      );
    }

    return parts.length > 0
      ? '\n            ' + parts.join('\n            ')
      : '';
  }

  /**
   * Builds optional invoice reference / purchase order nodes.
   */
  private buildInvoiceMetaXml(voucher: TallyVoucherDTO): string {
    const parts: string[] = [];

    if (voucher.invoiceNumber) {
      if (voucher.voucherType?.toLowerCase().includes('purchase')) {
        parts.push(
          `<REFERENCE>${this.escapeXml(voucher.invoiceNumber)}</REFERENCE>`,
        );
      } else {
        parts.push(
          `<INVOICENO>${this.escapeXml(voucher.invoiceNumber)}</INVOICENO>`,
        );
      }
    }
    if (voucher.purchaseOrder) {
      parts.push(`<ORDERNO>${this.escapeXml(voucher.purchaseOrder)}</ORDERNO>`);
    }
    if (voucher.paymentTerms) {
      parts.push(
        `<PAYMENTTERMS>${this.escapeXml(voucher.paymentTerms)}</PAYMENTTERMS>`,
      );
    }

    return parts.length > 0
      ? '\n            ' + parts.join('\n            ')
      : '';
  }

  // ─────────────────────────────────────────────
  // PUBLIC: MAIN BUILD METHOD
  // ─────────────────────────────────────────────

  /**
   * Builds a TallyPrime-compatible XML import payload for a purchase voucher.
   * Performs full safety validation before generating XML.
   */
  async buildVoucherXml(voucherData: TallyVoucherDTO): Promise<string> {
    // ── Step 1: Validate ──────────────────────────────────────────────────
    const validation = this.validateVoucher(voucherData);
    if (!validation.valid) {
      throw new Error(
        `TallyXmlBuilder validation failed: ${validation.errors.join('; ')}`,
      );
    }

    // ── Step 2: Resolve company name ──────────────────────────────────────
    const companyName = this.escapeXml(
      await this.companyResolver.resolveCompanyName(voucherData.companyId),
    );

    const isEdit = voucherData.isEdit ? 'Yes' : 'No';
    const action = isEdit === 'Yes' ? 'Alter' : 'Create';
    const narration = this.buildNarration(voucherData);
    const partyName =
      voucherData.partyLedgerName ||
      voucherData.lines.find((l) => l.isParty)?.ledgerName ||
      '';

    // ── Step 3: Optional sections ─────────────────────────────────────────
    const gstDetailsXml = this.buildGstDetailsXml(voucherData);
    const invoiceMetaXml = this.buildInvoiceMetaXml(voucherData);

    // ── Step 4: Ledger entries (all lines) ────────────────────────────────
    const accountingLines = voucherData.lines.filter(
      (l) => !this.isInventoryLine(l)
    );
    const ledgerEntriesXml = accountingLines
      .map((line) => this.buildLedgerEntryXml(line, voucherData))
      .join('');

    // ── Step 5: Inventory entries (lines with HSN/qty) ────────────────────
    const inventoryLines = voucherData.lines.filter(
      (l) => this.isInventoryLine(l)
    );
    const inventoryEntriesXml = inventoryLines
      .map((line) => this.buildInventoryEntryXml(line))
      .join('');

    // ── Step 6: Assemble full XML ─────────────────────────────────────────
    const xml = `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="${this.escapeXml(voucherData.voucherType)}" ACTION="${action}">
            ${voucherData.guid ? `<GUID>${this.escapeXml(voucherData.guid)}</GUID>` : ''}
            <DATE>${this.escapeXml(voucherData.date)}</DATE>
            <VOUCHERTYPENAME>${this.escapeXml(voucherData.voucherType)}</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${this.escapeXml(voucherData.voucherNumber)}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${this.escapeXml(partyName)}</PARTYLEDGERNAME>
            <NARRATION>${this.escapeXml(narration)}</NARRATION>${gstDetailsXml}${invoiceMetaXml}
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
            <ISINVOICE>${inventoryLines.length > 0 ? 'Yes' : 'No'}</ISINVOICE>
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
            <INVOICEEXPORTLIST.LIST/>${ledgerEntriesXml}${inventoryEntriesXml}
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

    return xml;
  }

  // ─────────────────────────────────────────────
  // PUBLIC: EXPORT XML (unchanged)
  // ─────────────────────────────────────────────

  /**
   * Builds a TallyPrime compatible XML export payload to verify if a voucher exists.
   */
  async buildExportXml(
    criteria: {
      voucherNumber?: string;
      guid?: string;
      masterId?: string;
      externalInvoiceNumber?: string;
      voucherType?: string;
      partyLedger?: string;
      amount?: number;
      date?: Date;
    },
    companyId?: string,
  ): Promise<string> {
    const safeCompany = this.escapeXml(
      await this.companyResolver.resolveCompanyName(companyId),
    );

    // We try to include as many specific static variables as Tally allows.
    // Tally's Voucher Register can filter by VOUCHERNO, VOUCHERTYPENAME, etc.
    let staticVariables = `
          <SVCURRENTCOMPANY>${safeCompany}</SVCURRENTCOMPANY>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>`;

    if (criteria.voucherNumber) {
      staticVariables += `\n          <VOUCHERNO>${this.escapeXml(criteria.voucherNumber)}</VOUCHERNO>`;
    }
    if (criteria.voucherType) {
      staticVariables += `\n          <VOUCHERTYPENAME>${this.escapeXml(criteria.voucherType)}</VOUCHERTYPENAME>`;
    }
    if (criteria.guid) {
      staticVariables += `\n          <GUID>${this.escapeXml(criteria.guid)}</GUID>`;
    }
    if (criteria.masterId) {
      staticVariables += `\n          <MASTERID>${this.escapeXml(criteria.masterId)}</MASTERID>`;
    }
    if (criteria.externalInvoiceNumber) {
      staticVariables += `\n          <INVOICENO>${this.escapeXml(criteria.externalInvoiceNumber)}</INVOICENO>`;
    }
    if (criteria.partyLedger) {
      staticVariables += `\n          <LEDGERNAME>${this.escapeXml(criteria.partyLedger)}</LEDGERNAME>`;
    }

    return `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Voucher</REPORTNAME>
        <STATICVARIABLES>${staticVariables}
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;
  }
}
