import { Injectable } from '@nestjs/common';
import { BasePaymentParser } from '../parsers/base.parser';
import { RazorpayParser } from '../parsers/razorpay.parser';
import { GenericParser } from '../parsers/generic.parser';
import { GATEWAYS } from '../constants/parser.constants';
import { LoggerService } from '../../../core/logger/logger.service';

@Injectable()
export class ParserSelector {
  constructor(
    private readonly razorpayParser: RazorpayParser,
    private readonly genericParser: GenericParser,
    private readonly logger: LoggerService,
  ) {}

  select(gatewayIdentifier: string): BasePaymentParser {
    this.logger.debug(
      `Selecting parser for ${gatewayIdentifier}`,
      'ParserSelector',
    );

    switch (gatewayIdentifier) {
      case GATEWAYS.RAZORPAY:
        return this.razorpayParser;
      // Other gateways omitted for brevity (Easebuzz, BillDesk, HDFC, ICICI)
      // they follow the exact same structural pattern as RazorpayParser.
      default:
        return this.genericParser;
    }
  }
}
