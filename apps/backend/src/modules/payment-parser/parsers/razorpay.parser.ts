import { Injectable } from '@nestjs/common';
import { BasePaymentParser } from './base.parser';
import { GATEWAYS } from '../constants/parser.constants';

@Injectable()
export class RazorpayParser extends BasePaymentParser {
  identifier = GATEWAYS.RAZORPAY;

  canParse(email: any): boolean {
    return email.sender.includes('razorpay.com');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected extractFields(email: any) {
    // Regex based extraction logic for Razorpay specific email bodies
    // Mocked for the milestone framework implementation
    return {
      transactionId: 'pay_ABC123XYZ',
      amount: 1500,
      currency: 'INR',
      feeMonth: 'April',
      rawData: { _rawBodyMock: true },
    };
  }
}
