// @ts-nocheck
import { FakeInvoiceExtractionProvider } from './src/modules/vendor-slip/infrastructure/providers/fake-extraction.provider';

async function bootstrap() {
  const provider = new FakeInvoiceExtractionProvider();
  const rawText = "INVOICE 123\nDate: 2023-10-15\nVendor: Acme Corp\nTotal: 1500.00";
  
  console.log('--- Raw OCR text ---');
  console.log(rawText);

  const dto = await provider.extractInvoiceData(rawText);
  console.log('\n--- Extracted DTO ---');
  console.log(JSON.stringify(dto, null, 2));

  console.log('\n--- Field-by-field comparison ---');
  console.log(`Vendor Name: Expected "Acme Corp" | Extracted "${dto.extractedName}" -> ${dto.extractedName === 'Acme Corp' ? 'Correct' : 'Incorrect'}`);
  console.log(`Invoice Number: Expected "123" | Extracted "${dto.invoiceNumber}" -> ${dto.invoiceNumber === '123' ? 'Correct' : 'Incorrect'}`);
  console.log(`GST Number: Expected null | Extracted ${dto.extractedGstin} -> ${dto.extractedGstin === null ? 'Correct' : 'Incorrect'}`);
  console.log(`Total: Expected 1500 | Extracted ${dto.total} -> ${dto.total === 1500 ? 'Correct' : 'Incorrect'}`);
}
bootstrap();
