import { Injectable } from '@nestjs/common';
import { IERPAdapter } from '../interfaces/erp.interfaces';

@Injectable()
export class ERPResponseParser {
  parseAndValidate(adapter: IERPAdapter, rawResponse: any) {
    const parsed = adapter.parseResponse(rawResponse);
    const isValid = adapter.validateResponse(parsed);
    return { parsed, isValid };
  }
}
