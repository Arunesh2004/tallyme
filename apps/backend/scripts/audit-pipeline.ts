import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AzureOCRProvider } from '../src/modules/document-processing/providers/azure-ocr.provider';
import { GeminiExtractionProvider } from '../src/modules/document-processing/providers/gemini-extraction.provider';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const azureOcr = app.get(AzureOCRProvider);
  const geminiAi = app.get(GeminiExtractionProvider);
  const prisma = app.get(PrismaService);

  const imagePath = path.resolve(__dirname, '../../../images/Screenshot 2026-07-26 234527.png');
  console.log('Stage 1: Image Loaded -', imagePath);
  const buffer = fs.readFileSync(imagePath);

  console.log('\n--- Stage 2: Running Azure OCR ---');
  let ocrResult;
  try {
    ocrResult = await azureOcr.extractText(buffer);
    fs.writeFileSync('raw-ocr.json', JSON.stringify(ocrResult, null, 2));
    console.log('Saved OCR Result to raw-ocr.json');
  } catch(e: any) {
    console.error('Azure OCR failed', e.message);
  }

  console.log('\n--- Stage 3 & 4: Running Gemini Extraction ---');
  const rawText = ocrResult?.text || "Mock OCR Text for testing if Azure fails";
  
  // We'll capture the exact prompt
  const prompt = `Extract the invoice details from the following OCR text:\n\n${rawText}`;
  fs.writeFileSync('ai-input.txt', prompt);
  console.log('Saved AI Input to ai-input.txt');

  let aiResult;
  try {
    aiResult = await geminiAi.extractInvoiceFields(rawText);
    fs.writeFileSync('ai-output.json', JSON.stringify(aiResult, null, 2));
    console.log('Saved AI Output to ai-output.json');
  } catch(e: any) {
    console.error('Gemini Extraction failed', e.message);
  }

  console.log('\n--- Stage 5 & 6 & 7: Generating Candidate ---');
  // Usually this is saved via prisma.invoiceCandidate.create
  // We will just log the mock object that would be saved.
  const candidate = {
    fileId: "mock-file-id",
    data: aiResult,
    status: 'PENDING_REVIEW',
  };
  fs.writeFileSync('invoice-candidate.json', JSON.stringify(candidate, null, 2));
  console.log('Saved Invoice Candidate to invoice-candidate.json');

  await app.close();
}

bootstrap().catch(console.error);
