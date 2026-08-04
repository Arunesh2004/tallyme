import { GoogleGenAI, Type } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';

async function runAudit() {
  const envContent = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8');
  let apiKey = '';
  for (const line of envContent.split('\n')) {
    if (line.startsWith('AI_API_KEY=')) {
      apiKey = line.split('=')[1].trim();
    }
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = 'models/gemini-flash-lite-latest';

  const imagePath = path.resolve(__dirname, '../../../images/Screenshot 2026-07-26 234527.png');
  const buffer = fs.readFileSync(imagePath);

  console.log('\n--- Extraction Phase (Gemini Multimodal) ---');
  
  const systemInstruction = `You are a strict, highly accurate GST invoice data extraction system.
Analyze the provided document (image and/or OCR text) and extract the invoice fields precisely.
Rules:
1. NEVER hallucinate. If a field is not present, return null.
2. Preserve exact Invoice Numbers and GSTINs without altering characters.
3. For line items, extract every row. If HSN or other fields are missing in a row, set them to null.
4. Correctly distinguish between CGST, SGST, IGST, and CESS.
5. Provide a confidence score (0.0 to 1.0) based on the clarity and completeness of the extraction.`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      vendorName: { type: Type.STRING, nullable: true },
      vendorAddress: { type: Type.STRING, nullable: true },
      gstin: { type: Type.STRING, nullable: true },
      pan: { type: Type.STRING, nullable: true },
      invoiceNumber: { type: Type.STRING, nullable: true },
      invoiceDate: { type: Type.STRING, nullable: true, description: 'Format: YYYY-MM-DD' },
      purchaseOrder: { type: Type.STRING, nullable: true },
      state: { type: Type.STRING, nullable: true },
      placeOfSupply: { type: Type.STRING, nullable: true },
      subtotal: { type: Type.NUMBER, nullable: true },
      discount: { type: Type.NUMBER, nullable: true },
      freight: { type: Type.NUMBER, nullable: true },
      otherCharges: { type: Type.NUMBER, nullable: true },
      cgst: { type: Type.NUMBER, nullable: true },
      sgst: { type: Type.NUMBER, nullable: true },
      igst: { type: Type.NUMBER, nullable: true },
      cess: { type: Type.NUMBER, nullable: true },
      roundOff: { type: Type.NUMBER, nullable: true },
      amount: { type: Type.NUMBER, nullable: true },
      taxAmount: { type: Type.NUMBER, nullable: true },
      paymentTerms: { type: Type.STRING, nullable: true },
      bankDetails: {
        type: Type.OBJECT,
        nullable: true,
        properties: {
          accountNumber: { type: Type.STRING, nullable: true },
          ifsc: { type: Type.STRING, nullable: true },
          bankName: { type: Type.STRING, nullable: true },
        },
      },
      lineItems: {
        type: Type.ARRAY,
        nullable: true,
        items: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING, nullable: true },
            hsnSac: { type: Type.STRING, nullable: true },
            quantity: { type: Type.NUMBER, nullable: true },
            unit: { type: Type.STRING, nullable: true },
            rate: { type: Type.NUMBER, nullable: true },
            discount: { type: Type.NUMBER, nullable: true },
            taxPercent: { type: Type.NUMBER, nullable: true },
            taxAmount: { type: Type.NUMBER, nullable: true },
            amount: { type: Type.NUMBER, nullable: true },
          },
        },
      },
      confidence: { type: Type.NUMBER },
    },
  };

  try {
    const parts: any[] = [{ text: systemInstruction }];
    parts.push({
      inlineData: {
        data: buffer.toString('base64'),
        mimeType: 'image/png',
      },
    });
    parts.push({
      text: 'Extract the complete structured JSON from this invoice according to the schema.',
    });

    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: parts,
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    });

    const result = JSON.parse(response.text || '{}');
    fs.writeFileSync('audit-ai-output-multimodal.json', JSON.stringify(result, null, 2));
    console.log('Extraction completed and saved to audit-ai-output-multimodal.json');

    // Show top-level extracted data
    console.log(JSON.stringify(result, null, 2));
  } catch(e) {
    console.error('Extraction failed', e);
  }
}

runAudit().catch(console.error);
