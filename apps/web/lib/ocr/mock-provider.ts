import { OCRProvider, OCRResult } from './provider';
import crypto from 'crypto';

export class MockOCRProvider implements OCRProvider {
  // eslint-disable-next-line no-unused-vars
  async process(fileBuffer: Buffer, mimeType: string): Promise<OCRResult> {
    // Generate deterministic hash of file content
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const hashInt = parseInt(hash.substring(0, 8), 16);
    
    // Generate deterministic dummy fields based on hash
    const vendors = ['Acme Corp', 'TechFlow India', 'Global Supplies Pvt Ltd', 'OfficeMart', 'CloudSync Services'];
    const amounts = [15000, 2450.50, 48000, 1200, 95000.75];
    const gstins = ['27AADCB2230M1Z2', '29GGGGG1314R9Z6', '07AAAAA0000A1Z5', '33ABCDE1234F1Z1', '19PQRST5678G2Z4'];
    
    const index = hashInt % vendors.length;
    
    const vendor = vendors[index];
    const amount = amounts[index];
    const gstin = gstins[index];
    const invoiceNo = `INV-${hash.substring(0, 4).toUpperCase()}-${hashInt % 1000}`;
    const date = new Date(Date.now() - (hashInt % 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const rawText = `INVOICE\nVendor: ${vendor}\nGSTIN: ${gstin}\nInvoice No: ${invoiceNo}\nDate: ${date}\nTotal Amount: ${amount}\nItems: Various`;
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    return {
      rawText,
      metadata: {
        confidence: 0.85 + ((hashInt % 15) / 100), // Between 0.85 and 0.99
        pages: 1,
        provider: 'MockOCRProvider (Hash-based)'
      }
    };
  }
}
