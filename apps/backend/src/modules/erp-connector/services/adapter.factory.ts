import { Injectable } from '@nestjs/common';
import { IERPAdapter } from '../interfaces/erp.interfaces';
import { TallyPrimeAdapter } from '../adapters/tally-prime.adapter';
import { ERP_ADAPTERS } from '../constants/erp.constants';

@Injectable()
export class ERPAdapterFactory {
  constructor(private readonly tallyAdapter: TallyPrimeAdapter) {}

  getAdapter(adapterCode: string): IERPAdapter {
    switch (adapterCode) {
      case ERP_ADAPTERS.TALLY_PRIME_V1:
        return this.tallyAdapter;
      default:
        throw new Error(`Unsupported ERP Adapter: ${adapterCode}`);
    }
  }
}
