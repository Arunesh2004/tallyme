import { Injectable } from '@nestjs/common';
import { BasePaymentParser } from './base.parser';
import { GATEWAYS } from '../constants/parser.constants';

@Injectable()
export class GenericParser extends BasePaymentParser {
  identifier = GATEWAYS.GENERIC;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canParse(email: any): boolean {
    return true; // Fallback
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected extractFields(email: any) {
    return {
      rawData: { fallback: true },
    };
  }
}
