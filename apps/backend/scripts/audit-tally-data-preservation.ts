import { Test, TestingModule } from '@nestjs/testing';
import { PrismaVoucherCandidateRepository } from '../src/modules/erp-connector/repositories/prisma-voucher-candidate.repository';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { ProcessVoucherBuilderUseCase } from '../src/modules/voucher-builder/use-cases/process-voucher-builder.use-case';
import { VoucherBuilderEngine } from '../src/modules/voucher-builder/services/voucher-builder.engine';
import { PurchaseStrategy } from '../src/modules/voucher-builder/services/strategies/purchase.strategy';
import { LedgerResolver } from '../src/modules/voucher-builder/services/ledger.resolver';
import { ReferenceGenerator } from '../src/modules/voucher-builder/services/reference.generator';
import { VoucherValidator } from '../src/modules/voucher-builder/services/voucher.validator';
import { VoucherStrategyFactory } from '../src/modules/voucher-builder/services/strategies/voucher.strategy.factory';
import { ReceiptStrategy } from '../src/modules/voucher-builder/services/strategies/receipt.strategy';
import { PrismaVoucherRepository } from '../src/modules/voucher-builder/repositories/prisma-voucher.repository';
import { NarrationBuilder } from '../src/modules/voucher-builder/services/narration.builder';
import * as fs from 'fs';
import * as path from 'path';

import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../src/core/logger/logger.service';

async function runAudit() {
  console.log('Starting Tally Data Preservation Audit...');
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/tallyme?schema=public';

  const moduleRef: TestingModule = await Test.createTestingModule({
    providers: [
      PrismaService,
      PrismaVoucherCandidateRepository,
      ProcessVoucherBuilderUseCase,
      VoucherBuilderEngine,
      VoucherStrategyFactory,
      ReceiptStrategy,
      PurchaseStrategy,
      NarrationBuilder,
      LedgerResolver,
      ReferenceGenerator,
      VoucherValidator,
      PrismaVoucherRepository,
      {
        provide: 'VOUCHER_REPOSITORY',
        useClass: PrismaVoucherRepository,
      },
      {
        provide: 'QUEUE_PROVIDER',
        useValue: { addJob: async () => {} },
      },
      {
        provide: LoggerService,
        useValue: { log: console.log, debug: console.log, error: console.error, warn: console.warn },
      },
      {
        provide: ConfigService,
        useValue: { 
          get: (key: string) => {
            if (key === 'database.url' || key === 'DATABASE_URL') return 'postgresql://postgres:postgres@localhost:5432/tallyme?schema=public';
            return undefined;
          } 
        },
      }
    ],
  }).compile();

  const repo = moduleRef.get(PrismaVoucherCandidateRepository);
  const prisma = moduleRef.get(PrismaService);
  const useCase = moduleRef.get(ProcessVoucherBuilderUseCase);

  // Setup Mock Data matching AccountingIntelligenceService output
  const mockPayload = {
    companyId: 'test-company',
    candidateId: 'test-candidate',
    voucherType: 'PURCHASE',
    allocation: {
      totalAmount: 1180,
      vendorLedger: 'Acme Corp',
      debitLines: [
        { ledger: 'Stationery', amount: 1000, hsnSac: '4802', rate: 100, quantity: 10, unit: 'Nos' },
        { ledger: 'CGST', amount: 90 },
        { ledger: 'SGST', amount: 90 },
      ],
      creditLines: [
        { ledger: 'Acme Corp', amount: 1180, isVendor: true }
      ]
    },
    invoice: { number: 'INV-123', date: new Date().toISOString() },
    metadata: {
      gstin: '29ABCDE1234F1Z5',
      pan: 'ABCDE1234F',
      state: 'Karnataka',
      placeOfSupply: '29-Karnataka',
      purchaseOrder: 'PO-999',
      paymentTerms: 'Net 30',
      taxes: { cgst: 90, sgst: 90, igst: null, cess: null },
      lineItems: [
        { description: 'Stationery', hsnSac: '4802', quantity: 10, unit: 'Nos', rate: 100, amount: 1000 }
      ],
      ledgerDecisions: {}
    }
  };

  try {
    // 1. Create company mock if not exist
    await prisma.company.upsert({
      where: { id: 'test-company' },
      update: {},
      create: { id: 'test-company', name: 'Test Company' }
    });

    // 2. Execute process (this saves to DB)
    await useCase.execute(mockPayload);
    
    // Get the saved voucher candidate (using prisma to find the latest)
    const latest = await prisma.voucherCandidate.findFirst({
      where: { companyId: 'test-company' },
      orderBy: { id: 'desc' }
    });

    if (!latest) throw new Error('VoucherCandidate not saved');

    // 3. Retrieve using repository
    const retrieved = await repo.findById(latest.id);
    console.log("RETRIEVED DATA:", JSON.stringify(retrieved, null, 2));
    
    // 4. Validate preserved fields
    let report = `# Tally XML Data Preservation Report\n\n`;
    report += `## Audit Verification\n\n`;
    
    const errors: string[] = [];
    
    if (retrieved?.supplierGstin !== '29ABCDE1234F1Z5') errors.push('GSTIN lost');
    if (retrieved?.supplierPan !== 'ABCDE1234F') errors.push('PAN lost');
    if (retrieved?.supplierState !== 'Karnataka') errors.push('State lost');
    if (retrieved?.placeOfSupply !== '29-Karnataka') errors.push('Place of Supply lost');
    if (retrieved?.purchaseOrder !== 'PO-999') errors.push('Purchase Order lost');
    if (retrieved?.paymentTerms !== 'Net 30') errors.push('Payment Terms lost');
    
    if (retrieved?.cgst !== 90) errors.push('CGST lost');
    if (retrieved?.sgst !== 90) errors.push('SGST lost');

    const statLine = retrieved?.lines.find((l: any) => l.ledgerName === 'Stationery');
    if (!statLine) errors.push('Line item lost');
    else {
      if (statLine.hsnCode !== '4802') errors.push('HSN lost');
      if (statLine.quantity !== 10) errors.push('Quantity lost');
      if (statLine.rate !== 100) errors.push('Rate lost');
      if (statLine.unit !== 'Nos') errors.push('Unit lost');
    }

    if (errors.length > 0) {
      report += `❌ Data Preservation Failed\n\nErrors:\n- ${errors.join('\n- ')}\n`;
    } else {
      report += `✅ Data Preservation Successful\n\nAll extracted metadata and line item properties successfully survived the Prisma bottleneck and are now correctly populated in the TallyVoucherDTO.\n`;
      report += `\n### Retrieved Output Sample\n\`\`\`json\n${JSON.stringify(retrieved, null, 2)}\n\`\`\`\n`;
    }

    // Write to artifact directory
    const reportPath = path.join('C:\\Users\\Administrator\\.gemini\\antigravity-ide\\brain\\c71cae45-487b-4bae-890c-f56c41cc28c3', 'TALLY_DATA_PRESERVATION_REPORT.md');
    fs.writeFileSync(reportPath, report);
    console.log(`Report generated at: ${reportPath}`);

  } catch (err: any) {
    console.error('Audit failed:', err);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

runAudit();
