import { AIExtractor, ExtractedInvoice } from './extractor';

export class MockAIExtractor implements AIExtractor {
  async extractInvoice(rawText: string): Promise<ExtractedInvoice> {
    // A simple regex-based parser to extract from our MockOCRProvider's deterministic output
    // In reality, this would call Gemini.
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate AI delay
    
    const vendorMatch = rawText.match(/Vendor:\s*(.*)/);
    const gstinMatch = rawText.match(/GSTIN:\s*(.*)/);
    const invoiceMatch = rawText.match(/Invoice No:\s*(.*)/);
    const dateMatch = rawText.match(/Date:\s*(.*)/);
    const amountMatch = rawText.match(/Total Amount:\s*([\d.]+)/);
    
    const amount = amountMatch ? parseFloat(amountMatch[1]) : null;
    
    return {
      vendorName: vendorMatch ? vendorMatch[1].trim() : null,
      gstin: gstinMatch ? gstinMatch[1].trim() : null,
      invoiceNumber: invoiceMatch ? invoiceMatch[1].trim() : null,
      date: dateMatch ? dateMatch[1].trim() : null,
      totalAmount: amount,
      taxAmount: amount ? parseFloat((amount * 0.18).toFixed(2)) : null, // Assuming 18% GST for mock
      confidenceScore: 0.92
    };
  }
}
