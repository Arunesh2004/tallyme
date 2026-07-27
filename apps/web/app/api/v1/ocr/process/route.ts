import { NextResponse } from 'next/server';
import { MockOCRProvider } from '@/lib/ocr/mock-provider';
import { MockAIExtractor } from '@/lib/ai/mock-extractor';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported file format' }, { status: 415 });
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 413 });
    }

    // Read the file as buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Initialize Mock Providers (These would be injected or constructed based on config in production)
    const ocrProvider = new MockOCRProvider();
    const aiExtractor = new MockAIExtractor();

    // 1. OCR Extraction
    const ocrResult = await ocrProvider.process(buffer, file.type);

    // 2. AI Structured Extraction
    const extractedData = await aiExtractor.extractInvoice(ocrResult.rawText);

    return NextResponse.json({
      success: true,
      data: extractedData,
      metadata: ocrResult.metadata
    });
    
  } catch (error: any) {
    console.error('OCR Process Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
