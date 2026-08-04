import { Injectable } from '@nestjs/common';
import {
  CanonicalAccountingModel,
} from '../../universal-transaction/domain/types';
import { TransactionIntent } from '../../universal-transaction/domain/enums';

@Injectable()
export class VendorSlipDraftAdapter {
  map(genericPayload: any): CanonicalAccountingModel {
    const {
      voucherType,
      candidateId,
      companyId,
      allocation,
      invoice,
      metadata,
    } = genericPayload;

    const ledgerEntries = [];
    
    if (allocation?.debitLines) {
      for (const line of allocation.debitLines) {
        ledgerEntries.push({
          ledgerId: line.ledger, // using name as ID for now since we mapped name in intelligence
          amount: String(line.amount),
          isDebit: true,
        });
      }
    }

    if (allocation?.creditLines) {
      for (const line of allocation.creditLines) {
        ledgerEntries.push({
          ledgerId: line.ledger,
          amount: String(line.amount),
          isDebit: false,
        });
      }
    }

    // Attempt to determine financial year based on invoice date
    const date = invoice?.date ? new Date(invoice.date) : new Date();
    const year = date.getFullYear();
    const month = date.getMonth();
    const fy = month < 3 ? `${year - 1}-${year}` : `${year}-${year + 1}`;

    return {
      header: {
        tenantId: 'default', // Tenant multi-tenancy abstracted
        transactionIntent: TransactionIntent.PURCHASE,
        voucherType: voucherType || 'Purchase',
        companyId: companyId,
        financialYear: fy,
        currency: 'INR',
        exchangeRate: '1.0',
        status: 'DRAFT',
        invoiceNumber: invoice?.number,
        invoiceDate: invoice?.date,
      },
      parties: {
        vendorId: allocation?.vendorLedger,
      },
      taxAndCompliance: {
        gstInfo: {
          gstin: metadata?.gstin || '',
          placeOfSupply: metadata?.placeOfSupply || '',
        },
      },
      ledgerEntries,
      metadata: {
        auditVersion: 1,
        documentHash: candidateId, // Can use candidate ID as a proxy for duplicate detection for now
      },
    };
  }
}
