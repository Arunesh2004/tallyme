import { Injectable } from '@nestjs/common';
import { GATEWAYS } from '../constants/parser.constants';
import { LoggerService } from '../../../core/logger/logger.service';

@Injectable()
export class GatewayDetector {
  constructor(private readonly logger: LoggerService) {}

  detect(email: any): string {
    const sender = (email.sender || '').toLowerCase();
    const subject = (email.subject || '').toLowerCase();

    if (sender.includes('razorpay.com') || subject.includes('razorpay'))
      return GATEWAYS.RAZORPAY;
    if (sender.includes('easebuzz.in') || subject.includes('easebuzz'))
      return GATEWAYS.EASEBUZZ;
    if (sender.includes('billdesk.com') || subject.includes('billdesk'))
      return GATEWAYS.BILLDESK;
    if (sender.includes('hdfcbank.net') || subject.includes('smarthub'))
      return GATEWAYS.HDFC_SMARTHUB;
    if (sender.includes('icicibank.com') || subject.includes('eazypay'))
      return GATEWAYS.ICICI_EAZYPAY;

    this.logger.warn(
      `Could not definitively detect gateway for email ${email.messageId}, falling back to generic`,
      'GatewayDetector',
    );
    return GATEWAYS.GENERIC;
  }
}
