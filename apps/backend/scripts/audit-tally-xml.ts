/**
 * audit-tally-xml.ts
 *
 * Phase H.2 — TallyPrime XML Integration Audit
 * Tests 6 scenarios against the upgraded TallyXmlBuilderService.
 * Writes TALLY_XML_INTEGRATION_REPORT.md on completion.
 */

import { TallyXmlBuilderService } from '../src/modules/erp-connector/services/xml-builder.service';
import { TallyVoucherDTO } from '../src/modules/erp-connector/dto/tally-voucher.dto';
import * as fs from 'fs';
import * as path from 'path';

// ──────────────────────────────────────────────
// Mock company resolver (no DB needed)
// ──────────────────────────────────────────────
const mockCompanyResolver = {
  resolveCompanyName: async (id?: string) => id ? `TestCompany-${id}` : 'TestCompany',
};

const builder = new TallyXmlBuilderService(mockCompanyResolver as any);

// ──────────────────────────────────────────────
// Helper assertions
// ──────────────────────────────────────────────
interface ScenarioResult {
  scenario: string;
  status: 'PASS' | 'FAIL';
  errors: string[];
  xml?: string;
  checks?: Record<string, boolean>;
}

function assertContains(xml: string, pattern: string | RegExp): boolean {
  return typeof pattern === 'string' ? xml.includes(pattern) : pattern.test(xml);
}

// ──────────────────────────────────────────────
// Scenarios
// ──────────────────────────────────────────────

async function scenario1_simplePurchase(): Promise<ScenarioResult> {
  const name = 'Scenario 1: Simple Purchase Invoice';
  const voucher: TallyVoucherDTO = {
    voucherNumber: 'PUR-001',
    date: '20260731',
    voucherType: 'Purchase',
    companyId: 'comp-1',
    partyLedgerName: 'Basic Supplier',
    lines: [
      { ledgerName: 'Basic Supplier', isDebit: false, isParty: true, amount: 1000 },
      { ledgerName: 'Purchase Account', isDebit: true, isParty: false, amount: 1000 },
    ],
  };

  try {
    const xml = await builder.buildVoucherXml(voucher);
    const checks: Record<string, boolean> = {
      'Has ENVELOPE': assertContains(xml, '<ENVELOPE>'),
      'Has VOUCHER': assertContains(xml, '<VOUCHER'),
      'Has DATE': assertContains(xml, '<DATE>20260731</DATE>'),
      'Has VOUCHERNUMBER': assertContains(xml, '<VOUCHERNUMBER>PUR-001</VOUCHERNUMBER>'),
      'Has PARTYLEDGERNAME': assertContains(xml, '<PARTYLEDGERNAME>Basic Supplier</PARTYLEDGERNAME>'),
      'Has supplier ledger entry': assertContains(xml, '<LEDGERNAME>Basic Supplier</LEDGERNAME>'),
      'Has purchase ledger entry': assertContains(xml, '<LEDGERNAME>Purchase Account</LEDGERNAME>'),
      'Has NARRATION': assertContains(xml, '<NARRATION>'),
      'No ISINVOICE=Yes (no inventory)': assertContains(xml, '<ISINVOICE>No</ISINVOICE>'),
    };
    const failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
    return { scenario: name, status: failed.length === 0 ? 'PASS' : 'FAIL', errors: failed, xml, checks };
  } catch (err: any) {
    return { scenario: name, status: 'FAIL', errors: [err.message] };
  }
}

async function scenario2_gstCgstSgst(): Promise<ScenarioResult> {
  const name = 'Scenario 2: GST Invoice (CGST + SGST)';
  const voucher: TallyVoucherDTO = {
    voucherNumber: 'PUR-002',
    date: '20260731',
    voucherType: 'Purchase',
    companyId: 'comp-1',
    partyLedgerName: 'GST Vendor',
    supplierGstin: '29ABCDE1234F1Z5',
    supplierState: 'Karnataka',
    placeOfSupply: '29-Karnataka',
    cgst: 90,
    sgst: 90,
    invoiceNumber: 'INV-GST-001',
    lines: [
      { ledgerName: 'GST Vendor', isDebit: false, isParty: true, amount: 1180 },
      { ledgerName: 'Office Supplies', isDebit: true, isParty: false, amount: 1000 },
      { ledgerName: 'CGST Input', isDebit: true, isParty: false, amount: 90 },
      { ledgerName: 'SGST Input', isDebit: true, isParty: false, amount: 90 },
    ],
  };

  try {
    const xml = await builder.buildVoucherXml(voucher);
    const checks: Record<string, boolean> = {
      'Has PARTYGSTIN': assertContains(xml, '<PARTYGSTIN>29ABCDE1234F1Z5</PARTYGSTIN>'),
      'Has SUPPLIERGSTIN': assertContains(xml, '<SUPPLIERGSTIN>29ABCDE1234F1Z5</SUPPLIERGSTIN>'),
      'Has STATENAME': assertContains(xml, '<STATENAME>Karnataka</STATENAME>'),
      'Has PLACEOFSUPPLY': assertContains(xml, '<PLACEOFSUPPLY>29-Karnataka</PLACEOFSUPPLY>'),
      'Has INVOICENO': assertContains(xml, '<INVOICENO>INV-GST-001</INVOICENO>'),
      'Has CGST ledger': assertContains(xml, '<LEDGERNAME>CGST Input</LEDGERNAME>'),
      'Has SGST ledger': assertContains(xml, '<LEDGERNAME>SGST Input</LEDGERNAME>'),
      'CGST has GSTCLASS': assertContains(xml, '<GSTCLASS>CGST</GSTCLASS>'),
      'SGST has GSTCLASS': assertContains(xml, '<GSTCLASS>SGST</GSTCLASS>'),
    };
    const failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
    return { scenario: name, status: failed.length === 0 ? 'PASS' : 'FAIL', errors: failed, xml, checks };
  } catch (err: any) {
    return { scenario: name, status: 'FAIL', errors: [err.message] };
  }
}

async function scenario3_igst(): Promise<ScenarioResult> {
  const name = 'Scenario 3: IGST Invoice (Interstate)';
  const voucher: TallyVoucherDTO = {
    voucherNumber: 'PUR-003',
    date: '20260731',
    voucherType: 'Purchase',
    companyId: 'comp-1',
    partyLedgerName: 'Mumbai Vendor',
    supplierGstin: '27XYZAB1234C1ZP',
    supplierState: 'Maharashtra',
    placeOfSupply: '27-Maharashtra',
    igst: 180,
    invoiceNumber: 'INV-IGST-002',
    lines: [
      { ledgerName: 'Mumbai Vendor', isDebit: false, isParty: true, amount: 1180 },
      { ledgerName: 'Raw Materials', isDebit: true, isParty: false, amount: 1000 },
      { ledgerName: 'IGST Input', isDebit: true, isParty: false, amount: 180 },
    ],
  };

  try {
    const xml = await builder.buildVoucherXml(voucher);
    const checks: Record<string, boolean> = {
      'Has IGST ledger': assertContains(xml, '<LEDGERNAME>IGST Input</LEDGERNAME>'),
      'IGST has GSTCLASS': assertContains(xml, '<GSTCLASS>IGST</GSTCLASS>'),
      'Has SUPPLIERGSTIN': assertContains(xml, '<SUPPLIERGSTIN>27XYZAB1234C1ZP</SUPPLIERGSTIN>'),
      'Has PLACEOFSUPPLY': assertContains(xml, '<PLACEOFSUPPLY>27-Maharashtra</PLACEOFSUPPLY>'),
    };
    const failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
    return { scenario: name, status: failed.length === 0 ? 'PASS' : 'FAIL', errors: failed, xml, checks };
  } catch (err: any) {
    return { scenario: name, status: 'FAIL', errors: [err.message] };
  }
}

async function scenario4_inventoryItems(): Promise<ScenarioResult> {
  const name = 'Scenario 4: Invoice with Inventory Items';
  const voucher: TallyVoucherDTO = {
    voucherNumber: 'PUR-004',
    date: '20260731',
    voucherType: 'Purchase',
    companyId: 'comp-1',
    partyLedgerName: 'Stationery Supplier',
    supplierGstin: '29STATY1234S1Z5',
    invoiceNumber: 'INV-INV-003',
    lines: [
      { ledgerName: 'Stationery Supplier', isDebit: false, isParty: true, amount: 1180 },
      {
        ledgerName: 'Office Paper',
        isDebit: true, isParty: false, amount: 1000,
        hsnCode: '4802', quantity: 10, unit: 'Ream', rate: 100,
      },
      { ledgerName: 'CGST Input', isDebit: true, isParty: false, amount: 90 },
      { ledgerName: 'SGST Input', isDebit: true, isParty: false, amount: 90 },
    ],
  };

  try {
    const xml = await builder.buildVoucherXml(voucher);
    const checks: Record<string, boolean> = {
      'Has INVENTORYENTRIES.LIST': assertContains(xml, '<INVENTORYENTRIES.LIST>'),
      'Has STOCKITEMNAME': assertContains(xml, '<STOCKITEMNAME>Office Paper</STOCKITEMNAME>'),
      'Has HSNCODE': assertContains(xml, '<HSNCODE>4802</HSNCODE>'),
      'Has BILLEDQTY': assertContains(xml, '<BILLEDQTY>'),
      'Has ACTUALQTY': assertContains(xml, '<ACTUALQTY>'),
      'Has RATE node': assertContains(xml, '<RATE>'),
      'ISINVOICE=Yes': assertContains(xml, '<ISINVOICE>Yes</ISINVOICE>'),
    };
    const failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
    return { scenario: name, status: failed.length === 0 ? 'PASS' : 'FAIL', errors: failed, xml, checks };
  } catch (err: any) {
    return { scenario: name, status: 'FAIL', errors: [err.message] };
  }
}

async function scenario5_discountInvoice(): Promise<ScenarioResult> {
  const name = 'Scenario 5: Discount Invoice';
  const voucher: TallyVoucherDTO = {
    voucherNumber: 'PUR-005',
    date: '20260731',
    voucherType: 'Purchase',
    companyId: 'comp-1',
    partyLedgerName: 'Discount Vendor',
    purchaseOrder: 'PO-DISC-99',
    paymentTerms: 'Net 15',
    lines: [
      { ledgerName: 'Discount Vendor', isDebit: false, isParty: true, amount: 900 },
      { ledgerName: 'Purchase Account', isDebit: true, isParty: false, amount: 1000 },
      { ledgerName: 'Trade Discount', isDebit: false, isParty: false, amount: 100 },
    ],
  };

  try {
    const xml = await builder.buildVoucherXml(voucher);
    const checks: Record<string, boolean> = {
      'Has Discount Vendor': assertContains(xml, '<LEDGERNAME>Discount Vendor</LEDGERNAME>'),
      'Has Trade Discount ledger': assertContains(xml, '<LEDGERNAME>Trade Discount</LEDGERNAME>'),
      'Has ORDERNO (PO)': assertContains(xml, '<ORDERNO>PO-DISC-99</ORDERNO>'),
      'Has PAYMENTTERMS': assertContains(xml, '<PAYMENTTERMS>Net 15</PAYMENTTERMS>'),
    };
    const failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
    return { scenario: name, status: failed.length === 0 ? 'PASS' : 'FAIL', errors: failed, xml, checks };
  } catch (err: any) {
    return { scenario: name, status: 'FAIL', errors: [err.message] };
  }
}

async function scenario6_unbalancedRejection(): Promise<ScenarioResult> {
  const name = 'Scenario 6: Invalid Unbalanced Voucher (must be REJECTED)';
  const voucher: TallyVoucherDTO = {
    voucherNumber: 'PUR-006',
    date: '20260731',
    voucherType: 'Purchase',
    companyId: 'comp-1',
    lines: [
      { ledgerName: 'Bad Vendor', isDebit: false, isParty: true, amount: 1000 },
      { ledgerName: 'Purchase Account', isDebit: true, isParty: false, amount: 500 }, // UNBALANCED
    ],
  };

  try {
    await builder.buildVoucherXml(voucher);
    // If we reach here, it did NOT reject — that's a FAIL
    return {
      scenario: name,
      status: 'FAIL',
      errors: ['Unbalanced voucher was NOT rejected — safety validation missing'],
    };
  } catch (err: any) {
    const isExpected = err.message.includes('unbalanced') || err.message.includes('validation failed');
    return {
      scenario: name,
      status: isExpected ? 'PASS' : 'FAIL',
      errors: isExpected ? [] : [`Wrong error thrown: ${err.message}`],
      checks: { 'Correctly rejected unbalanced voucher': isExpected },
    };
  }
}

// ──────────────────────────────────────────────
// Runner
// ──────────────────────────────────────────────
async function runAllScenarios(): Promise<void> {
  console.log('━'.repeat(60));
  console.log('Phase H.2 — TallyPrime XML Integration Audit');
  console.log('━'.repeat(60));

  const results: ScenarioResult[] = await Promise.all([
    scenario1_simplePurchase(),
    scenario2_gstCgstSgst(),
    scenario3_igst(),
    scenario4_inventoryItems(),
    scenario5_discountInvoice(),
    scenario6_unbalancedRejection(),
  ]);

  let passCount = 0;
  let failCount = 0;

  for (const r of results) {
    const icon = r.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${r.scenario}`);
    if (r.checks) {
      for (const [check, ok] of Object.entries(r.checks)) {
        console.log(`   ${ok ? '  ✓' : '  ✗'} ${check}`);
      }
    }
    if (r.errors.length > 0) {
      for (const e of r.errors) console.log(`   ⚠  ${e}`);
    }
    if (r.status === 'PASS') passCount++; else failCount++;
  }

  console.log('━'.repeat(60));
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  console.log('━'.repeat(60));

  // ── Generate markdown report ────────────────────────────────────────────
  let md = `# Tally XML Integration Report\n\n`;
  md += `**Phase:** H.2 — TallyPrime XML Builder Upgrade  \n`;
  md += `**Date:** ${new Date().toISOString().split('T')[0]}  \n`;
  md += `**Overall Status:** ${failCount === 0 ? '✅ ALL PASSED' : `❌ ${failCount} FAILED`}\n\n`;
  md += `---\n\n`;
  md += `## Scenario Results\n\n`;
  md += `| Scenario | Status |\n|---|---|\n`;

  for (const r of results) {
    md += `| ${r.scenario} | ${r.status === 'PASS' ? '✅ PASS' : '❌ FAIL'} |\n`;
  }

  md += `\n---\n\n## Detailed Results\n\n`;

  for (const r of results) {
    md += `### ${r.status === 'PASS' ? '✅' : '❌'} ${r.scenario}\n\n`;
    if (r.checks) {
      md += `| Check | Result |\n|---|---|\n`;
      for (const [check, ok] of Object.entries(r.checks)) {
        md += `| ${check} | ${ok ? '✅' : '❌'} |\n`;
      }
      md += '\n';
    }
    if (r.errors.length > 0) {
      md += `**Errors:**\n`;
      for (const e of r.errors) md += `- ${e}\n`;
      md += '\n';
    }
    if (r.xml) {
      md += `<details><summary>Generated XML (first 1500 chars)</summary>\n\n\`\`\`xml\n${r.xml.slice(0, 1500)}\n\`\`\`\n</details>\n\n`;
    }
  }

  md += `---\n\n## Changes Made (Phase H.2)\n\n`;
  md += `### xml-builder.service.ts\n`;
  md += `- Full pre-generation safety validation (balance check, vendor existence, no undefined values)\n`;
  md += `- \`PARTYLEDGERNAME\` auto-resolved from party lines or DTO field\n`;
  md += `- \`PARTYGSTIN\`, \`SUPPLIERGSTIN\`, \`STATENAME\`, \`PLACEOFSUPPLY\` — generated when values exist\n`;
  md += `- \`INVOICENO\`, \`ORDERNO\`, \`PAYMENTTERMS\` — generated when values exist\n`;
  md += `- GST ledger auto-detection → \`GSTCLASS\` + \`TAXCLASSIFICATIONNAME\` nodes\n`;
  md += `- \`INVENTORYENTRIES.LIST\` with \`HSNCODE\`, \`BILLEDQTY\`, \`ACTUALQTY\`, \`RATE\`, \`AMOUNT\`\n`;
  md += `- \`ISINVOICE\` set to \`Yes\` when inventory lines are present\n`;
  md += `- Narration auto-generated from invoiceNumber if not provided\n`;
  md += `- Removed debug \`fs.writeFileSync\` call\n\n`;
  md += `### voucher-mapper.service.ts\n`;
  md += `- All Phase H.1 fields now passed through: supplier info, GST totals, invoice metadata, line-level HSN/qty/unit/rate\n\n`;

  const reportPath = path.join(
    'C:\\Users\\Administrator\\.gemini\\antigravity-ide\\brain\\c71cae45-487b-4bae-890c-f56c41cc28c3',
    'TALLY_XML_INTEGRATION_REPORT.md'
  );
  fs.writeFileSync(reportPath, md);
  console.log(`\nReport written to: ${reportPath}`);

  if (failCount > 0) process.exit(1);
}

runAllScenarios().catch((err) => {
  console.error('Audit runner crashed:', err);
  process.exit(1);
});
