import { Injectable } from '@nestjs/common';
import { IERPAdapter } from '../interfaces/erp.interfaces';

@Injectable()
export class ERPPayloadBuilder {
  build(adapter: IERPAdapter, voucherCandidate: any) {
    return adapter.buildPayload(voucherCandidate);
  }
}
