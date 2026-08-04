import { GoogleGenAI, Type } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runValidation() {
  const envContent = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8');
  let apiKey = '';
  for (const line of envContent.split('\n')) {
    if (line.startsWith('AI_API_KEY=')) {
      apiKey = line.split('=')[1].trim();
    }
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = 'models/gemini-flash-lite-latest';

  const imagesDir = path.resolve(__dirname, '../../../images');
  const files = fs.readdirSync(imagesDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'));

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

  const reports = [];

  for (const file of files) {
    console.log(`\nProcessing ${file}...`);
    const filePath = path.join(imagesDir, file);
    const buffer = fs.readFileSync(filePath);

    try {
      const parts: any[] = [{ text: systemInstruction }];
      parts.push({
        inlineData: {
          data: buffer.toString('base64'),
          mimeType: 'image/png', // assuming png for simplicity
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

      const extracted = JSON.parse(response.text || '{}');
      console.log(`Extraction successful for ${file}`);

      // Simulate Database Persistence to check for data loss
      const doc = await prisma.document.create({
        data: {
          id: `val-doc-${Date.now()}`,
          fileUrl: filePath,
          checksum: `mock-chk-${Date.now()}`,
          mimeType: 'image/png',
          uploadedBy: 'system',
          source: 'validation-script',
          status: 'UPLOADED',
        }
      });

      const candidate = await prisma.invoiceCandidate.create({
        data: {
          id: `val-cand-${Date.now()}`,
          documentId: doc.id,
          invoiceNumber: extracted.invoiceNumber || 'UNKNOWN',
          date: extracted.invoiceDate ? new Date(extracted.invoiceDate) : null,
          total: extracted.amount || 0,
          tax: extracted.taxAmount || 0,
          extractedGstin: extracted.gstin || null,
          extractedName: extracted.vendorName || null,
          extractedData: extracted, // Ensure full object goes in!
          status: 'EXTRACTED'
        }
      });

      // Verify no data loss in DB
      const fetchedCandidate = await prisma.invoiceCandidate.findUnique({ where: { id: candidate.id }});
      const dbExtractedData: any = fetchedCandidate?.extractedData || {};

      const dataLoss = {
        lineItemsLost: dbExtractedData.lineItems?.length !== extracted.lineItems?.length,
        gstinLost: dbExtractedData.gstin !== extracted.gstin,
        decimalLost: dbExtractedData.amount !== extracted.amount || dbExtractedData.cgst !== extracted.cgst
      };

      if (dataLoss.lineItemsLost || dataLoss.gstinLost || dataLoss.decimalLost) {
        console.error(`DATA LOSS DETECTED FOR ${file}!`, dataLoss);
      }

      // We consider item arrays and calculate accuracy heuristically for the report
      reports.push({
        file,
        extracted,
        dbVerified: !dataLoss.lineItemsLost && !dataLoss.gstinLost && !dataLoss.decimalLost
      });

    } catch (e: any) {
      console.error(`Failed to process ${file}`, e.message);
      reports.push({
        file,
        error: e.message
      });
    }
  }

  fs.writeFileSync('validation-results.json', JSON.stringify(reports, null, 2));
  console.log('Validation complete, results saved to validation-results.json');
}

runValidation().catch(console.error).finally(() => prisma.$disconnect());
