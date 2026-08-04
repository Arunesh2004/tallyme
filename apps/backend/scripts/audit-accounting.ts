import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { VendorSlipWorker } from '../src/modules/vendor-slip/queue/vendor-slip.worker';
import { PurchaseStrategy } from '../src/modules/voucher-builder/services/strategies/purchase.strategy';
import * as fs from 'fs';

async function audit() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const worker = app.get(VendorSlipWorker);
  const purchaseStrategy = app.get(PurchaseStrategy);

  const accountingIntelligence = app.get(require('../src/modules/accounting-intelligence/workflows/accounting-intelligence.service').AccountingIntelligenceService);

  console.log('--- Phase 1: Testing Accounting Intelligence Upgrades ---');
  const reportData = [];

  const candidates = await prisma.invoiceCandidate.findMany({
    take: 10
  });

  for (const candidate of candidates) {
    if (!candidate.extractedData) continue;
    const extractedData = candidate.extractedData as any;
    
    // Convert JsonValue properties into standard objects to bypass strict typing
    if (extractedData && typeof extractedData === 'object' && !Array.isArray(extractedData)) {
      if (!extractedData.vendorName) extractedData.vendorName = candidate.extractedName;
      if (!extractedData.amount) extractedData.amount = Number(candidate.total);
    }


    try {
      // Build Domain Candidate manually to bypass Worker orchestrator limits
      const extractedData = candidate.extractedData as any;
      const domainCandidate = {
         id: candidate.id,
         extractedData: extractedData,
         invoiceDate: { value: extractedData.invoiceDate ? new Date(extractedData.invoiceDate) : new Date() },
         invoiceNumber: { value: extractedData.invoiceNumber || 'INV-001' }
      };

      const genericPayload = await accountingIntelligence.generateVoucherPayload({
        candidateId: candidate.id,
        companyId: 'test-company',
        batchSyncItemId: 'test-batch',
        domainCandidate,
        vendorLedgerName: extractedData.vendorName || 'Generic Vendor',
        vendorId: 'vendor-123',
        normalizedConfidence: 0.95
      });

      const voucherResult = await purchaseStrategy.build(genericPayload);
      
      reportData.push({
        file: candidate.id,
        status: 'SUCCESS',
        isBalanced: voucherResult.isBalanced,
        totalDebit: voucherResult.totalDebit,
        totalCredit: voucherResult.totalCredit,
        lines: voucherResult.lines,
        metadata: genericPayload.metadata
      });

    } catch (e: any) {
      let parsedError = e.message;
      try {
        if (e.message.startsWith('{')) {
           const errObj = JSON.parse(e.message);
           parsedError = `Item: ${errObj.item}, HSN: ${errObj.hsn}, Reason: ${errObj.reason}, Suggested: ${errObj.suggestedCategory}`;
        }
      } catch (parseErr) {}

      reportData.push({
        file: candidate.id,
        status: 'ERROR',
        error: parsedError
      });
    }
  }

  // Generate markdown report
  const mdLines = ['# Accounting Intelligence Phase F.4 Report\n'];
  mdLines.push('## 1. 10 Invoice Validation Results\n');
  
  for (const r of reportData) {
    mdLines.push(`### ${r.file}`);
    mdLines.push(`- **Status:** ${r.status}`);
    if (r.status === 'SUCCESS') {
       mdLines.push(`- **Balanced:** ${r.isBalanced ? '✅ Yes' : '❌ No'} (Debit: ${r.totalDebit}, Credit: ${r.totalCredit})`);
       mdLines.push('- **Ledger Lines:**');
       for (const l of r.lines || []) {
          const gstMeta = l.hsnSac ? ` [HSN: ${l.hsnSac}]` : '';
          mdLines.push(`  - ${l.type}: ${l.ledgerName} = ${l.amount}${gstMeta}`);
       }
       mdLines.push('- **Metadata:**');
       mdLines.push(`  - GSTIN: ${r.metadata.gstin || 'None'}`);
       
       if (r.metadata.ledgerDecisions && r.metadata.ledgerDecisions.reconciliationAuditLog) {
           const rec = r.metadata.ledgerDecisions.reconciliationAuditLog;
           mdLines.push('- **Reconciliation Audit Log:**');
           mdLines.push(`  - Invoice Total: ${rec.invoiceTotal}`);
           mdLines.push(`  - Calculated Total: ${rec.calculatedTotal}`);
           mdLines.push(`  - Difference: ${rec.difference}`);
           mdLines.push(`  - Tax Recovered: ${rec.taxRecovered}`);
           mdLines.push(`  - Components Recovered: ${rec.componentsRecovered ? JSON.stringify(rec.componentsRecovered) : '[]'}`);
           mdLines.push(`  - Adjustments Applied: ${JSON.stringify(rec.adjustmentsApplied)}`);
           mdLines.push(`  - Final Decision: ${rec.finalDecision}`);
       }

       if (r.metadata.ledgerDecisions && r.metadata.ledgerDecisions.lineItems) {
           mdLines.push('- **Line Item Audit Log:**');
           for (const li of r.metadata.ledgerDecisions.lineItems) {
               mdLines.push(`  - \`${li.description}\` -> **${li.finalLedger}**`);
               mdLines.push(`    - HSN: ${li.hsn}, HSN Match: ${li.hsnMatch}, Keyword Match: ${li.keywordMatch}, Gemini Match: ${li.geminiMatch}, Confidence: ${li.confidence}`);
           }
       }
    } else {
       mdLines.push('- **Status:** ERROR');
       try {
           const errObj = JSON.parse(r.error);
           if (errObj.invoiceId && errObj.reason) {
               mdLines.push(`- **Error (Structured):** ${errObj.reason}`);
               mdLines.push(`- **Suggested Action:** ${errObj.suggestedAction}`);
           } else {
               mdLines.push(`- **Error:** ${r.error}`);
           }
       } catch (e) {
           mdLines.push(`- **Error:** ${r.error}`);
       }
    }
    mdLines.push('');
  }

  fs.writeFileSync('ACCOUNTING_INTELLIGENCE_PHASE_F4_REPORT.md', mdLines.join('\n'));
  console.log('Report generated: ACCOUNTING_INTELLIGENCE_PHASE_F4_REPORT.md');
  await app.close();
}

audit().catch(console.error);
