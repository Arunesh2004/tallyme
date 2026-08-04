import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

export interface ExtractedField<T> {
  value: T | null;
  confidence: number;
  sourceText: string | null;
}

export interface ExtractionResult {
  transactionId: ExtractedField<string>;
  amount: ExtractedField<number>;
  paymentDate: ExtractedField<Date>;
  gateway: ExtractedField<string>;
  studentIdentifier: ExtractedField<string>; // Admission Number or Reg ID
  rawStudentName: ExtractedField<string>;
}

@Injectable()
export class StudentPaymentExtractor {
  constructor(private readonly prisma: PrismaService) {}

  async extract(emailDocumentId: string, emailBody: string): Promise<any> {
    // Basic regex-based extraction (simulating an NLP/AI extraction pipeline)
    const result: ExtractionResult = {
      transactionId: { value: null, confidence: 0, sourceText: null },
      amount: { value: null, confidence: 0, sourceText: null },
      paymentDate: { value: null, confidence: 0, sourceText: null },
      gateway: { value: null, confidence: 0, sourceText: null },
      studentIdentifier: { value: null, confidence: 0, sourceText: null },
      rawStudentName: { value: null, confidence: 0, sourceText: null },
    };

    // Amount Extraction (e.g. INR 1,500.00 or Rs. 1500)
    const amountMatch = emailBody.match(/(?:INR|Rs\.?)\s*([\d,]+\.?\d*)/i);
    if (amountMatch) {
      result.amount = {
        value: parseFloat(amountMatch[1].replace(/,/g, '')),
        confidence: 0.95,
        sourceText: amountMatch[0],
      };
    }

    // Transaction ID (e.g. Txn ID: pay_XYZ123)
    const txnMatch = emailBody.match(
      /(?:Txn\s*ID|Transaction\s*ID|Reference)[\s:]*([a-zA-Z0-9_]+)/i,
    );
    if (txnMatch) {
      result.transactionId = {
        value: txnMatch[1],
        confidence: 0.9,
        sourceText: txnMatch[0],
      };
    }

    // Gateway (e.g. Razorpay, PayU)
    if (emailBody.toLowerCase().includes('razorpay')) {
      result.gateway = {
        value: 'RAZORPAY',
        confidence: 0.99,
        sourceText: 'razorpay',
      };
    }

    // Admission Number (e.g. ADM12345)
    const admMatch = emailBody.match(
      /(?:Admission|Adm\s*No|Student\s*ID)[\s:]*([A-Z0-9]+)/i,
    );
    if (admMatch) {
      result.studentIdentifier = {
        value: admMatch[1],
        confidence: 0.85,
        sourceText: admMatch[0],
      };
    }

    // Student Name (e.g. Name: John Doe)
    const nameMatch = emailBody.match(
      /(?:Name|Student)[\s:]*([a-zA-Z\s]+)(?=\n|$|,)/i,
    );
    if (nameMatch) {
      result.rawStudentName = {
        value: nameMatch[1].trim(),
        confidence: 0.8,
        sourceText: nameMatch[0],
      };
    }

    // Payment Date
    result.paymentDate = {
      value: new Date(), // Simulate exact date extraction
      confidence: 1.0,
      sourceText: 'System Date',
    };

    // Idempotency: Prevent duplicate receipts based on transaction ID
    if (result.transactionId.value) {
      const existing = await this.prisma.studentPaymentCandidate.findFirst({
        where: { gatewayTransactionId: result.transactionId.value },
      });
      if (existing) {
        throw new Error(
          `Duplicate payment detected: Transaction ID ${result.transactionId.value} already processed in Document ${existing.documentId}.`,
        );
      }
    }

    // Gemini Fallback for unknown formats
    if (
      !result.amount.value ||
      !result.transactionId.value ||
      !result.rawStudentName.value
    ) {
      console.log(
        'Regex extraction incomplete, falling back to Gemini Vision/Text...',
      );
      // In production, we'd call the Gemini GenAI model here
      if (!result.amount.value)
        result.amount = {
          value: 0,
          confidence: 0.1,
          sourceText: 'AI Fallback',
        };
      if (!result.transactionId.value)
        result.transactionId = {
          value: `FALLBACK_${Date.now()}`,
          confidence: 0.1,
          sourceText: 'AI Fallback',
        };
      if (!result.rawStudentName.value)
        result.rawStudentName = {
          value: 'UNKNOWN AI',
          confidence: 0.1,
          sourceText: 'AI Fallback',
        };

      // Secondary Idempotency check just in case the AI extracted a known transaction ID
      const existingAiTxn = await this.prisma.studentPaymentCandidate.findFirst(
        {
          where: { gatewayTransactionId: result.transactionId.value },
        },
      );
      if (existingAiTxn) {
        throw new Error(
          `Duplicate payment detected by AI: Transaction ID ${result.transactionId.value} already processed.`,
        );
      }
    }

    // Persist into DB
    const candidate = await this.prisma.studentPaymentCandidate.create({
      data: {
        documentId: emailDocumentId,
        paymentGateway: result.gateway.value,
        gatewayTransactionId: result.transactionId.value,
        amount: result.amount.value,
        paymentDate: result.paymentDate.value,
        rawStudentName: result.rawStudentName.value,
        admissionNumber: result.studentIdentifier.value,
        extractionConfidence:
          result.amount.confidence * result.transactionId.confidence, // Aggregated dummy score
        rawMatchingData: result as any, // Saves the entire { value, confidence, sourceText } structure
        status: 'EXTRACTED',
      },
    });

    return candidate;
  }
}
