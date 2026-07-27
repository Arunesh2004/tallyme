import { ExpenseAllocator } from './modules/vendor-slip/domain/services/index';
import { InvoiceCandidate, LedgerMapping } from './modules/vendor-slip/domain/entities/index';
import { InvoiceAmount, ExtractedSubtotal, ExtractedTax } from './modules/vendor-slip/domain/value-objects/index';

const allocator = new ExpenseAllocator();
const candidate = new InvoiceCandidate('cand1', 'doc1', null, null, null, new ExtractedSubtotal(100, 1, '100'), new ExtractedTax(18, 1, '18'), new InvoiceAmount(118, 1, '118'), null, { score: 1 } as any, 'EXTRACTED');
const mapping = new LedgerMapping('map1', 'vendor1', 'VENDOR_LEDGER');

const allocation = allocator.allocate(candidate, mapping, 'EXPENSE_LEDGER', 'GST_LEDGER');

console.log('Subtotal: 100');
console.log('GST: 18');
console.log('Grand Total: 118');
console.log('Generated allocation:', JSON.stringify(allocation.lineItems, null, 2));

const debitAmount = allocation.lineItems.reduce((acc, curr) => acc + curr.amount, 0);
console.log('Debit:', debitAmount);
console.log('Credit: 118');
