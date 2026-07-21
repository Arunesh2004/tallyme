import { Injectable } from '@nestjs/common';
import {
  IEmailParser,
  IPaymentExtractionProvider,
  IStudentMatcher,
  IFeeAllocator,
  IOutstandingFeeProvider,
  ParsedEmail,
  ExtractedPaymentData,
  StudentMatchResultData,
  OutstandingFeeData,
  FeeAllocationResult,
} from '../../domain/providers/student-fee.providers';

@Injectable()
export class FakeEmailParser implements IEmailParser {
  async parse(rawContent: string): Promise<ParsedEmail> {
    if (rawContent.includes('FAIL_PARSE')) {
      throw new Error('Email parsing failed');
    }
    return {
      textBody: rawContent,
    };
  }
}

@Injectable()
export class FakePaymentExtractionProvider implements IPaymentExtractionProvider {
  async extractPaymentDetails(
    parsedEmail: ParsedEmail,
  ): Promise<ExtractedPaymentData> {
    if (parsedEmail.textBody.includes('FAIL_EXTRACTION')) {
      throw new Error('Extraction failed');
    }

    if (parsedEmail.textBody.includes('LOW_CONF_EXTRACTION')) {
      return {
        confidence: 0.6,
      };
    }

    if (parsedEmail.textBody.includes('PARTIAL')) {
      return {
        paymentGateway: 'RAZORPAY',
        gatewayTransactionId: 'txn_123',
        amount: 500,
        paymentDate: new Date(),
        rawStudentName: 'John Doe',
        confidence: 0.95,
      };
    }

    if (parsedEmail.textBody.includes('ADVANCE')) {
      return {
        paymentGateway: 'RAZORPAY',
        gatewayTransactionId: 'txn_456',
        amount: 2000,
        paymentDate: new Date(),
        rawStudentName: 'John Doe',
        confidence: 0.95,
      };
    }

    if (parsedEmail.textBody.includes('OVERPAYMENT')) {
      return {
        paymentGateway: 'RAZORPAY',
        gatewayTransactionId: 'txn_999',
        amount: 1500,
        paymentDate: new Date(),
        rawStudentName: 'John Doe',
        confidence: 0.95,
      };
    }

    return {
      paymentGateway: 'RAZORPAY',
      gatewayTransactionId: 'txn_789',
      amount: 1000,
      paymentDate: new Date(),
      rawStudentName: 'John Doe',
      confidence: 0.99,
    };
  }
}

@Injectable()
export class FakeStudentMatcher implements IStudentMatcher {
  async matchStudent(
    paymentData: ExtractedPaymentData,
  ): Promise<StudentMatchResultData> {
    if (paymentData.rawStudentName === 'FAIL_MATCH') {
      return {
        studentId: null,
        confidence: 0,
        matchingStrategy: 'NAME_SEARCH',
        candidateList: [],
      };
    }

    if (paymentData.rawStudentName === 'MULTIPLE_MATCH') {
      return {
        studentId: null,
        confidence: 0.5,
        matchingStrategy: 'NAME_SEARCH',
        candidateList: [{ id: 'stu-1' }, { id: 'stu-2' }],
      };
    }

    return {
      studentId: 'student-123',
      confidence: 0.98,
      matchingStrategy: 'EXACT_NAME_AND_EMAIL',
      candidateList: null,
    };
  }
}

@Injectable()
export class FakeOutstandingFeeProvider implements IOutstandingFeeProvider {
  async getOutstandingFees(studentId: string): Promise<OutstandingFeeData[]> {
    return [
      {
        feeId: 'fee-1',
        studentId,
        amount: 1000,
        dueDate: new Date(),
        description: 'Tuition Fee Q1',
      },
    ];
  }
}

@Injectable()
export class FakeFeeAllocator implements IFeeAllocator {
  async allocate(
    amount: number,
    outstandingFees: OutstandingFeeData[],
  ): Promise<FeeAllocationResult> {
    const totalOutstanding = outstandingFees.reduce(
      (sum, f) => sum + f.amount,
      0,
    );

    if (amount === totalOutstanding) {
      return {
        totalAllocated: amount,
        allocationType: 'EXACT',
        allocatedFees: outstandingFees.map((f) => ({
          outstandingFeeId: f.feeId,
          amount: f.amount,
        })),
      };
    } else if (amount < totalOutstanding) {
      return {
        totalAllocated: amount,
        allocationType: 'PARTIAL',
        allocatedFees: [
          { outstandingFeeId: outstandingFees[0].feeId, amount: amount },
        ],
      };
    } else {
      const isAdvance = totalOutstanding === 0;
      return {
        totalAllocated: amount,
        allocationType: isAdvance ? 'ADVANCE' : 'OVERPAYMENT',
        allocatedFees: outstandingFees.map((f) => ({
          outstandingFeeId: f.feeId,
          amount: f.amount,
        })), // Remaining goes to advance unallocated conceptually
      };
    }
  }
}
