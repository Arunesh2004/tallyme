import { Injectable, Inject } from '@nestjs/common';
import { ERPAdapterFactory } from './adapter.factory';
import { IERPRepository } from '../interfaces/erp.interfaces';
import { ERP_REPOSITORY } from '../constants/erp.constants';

@Injectable()
export class ERPConnectionManager {
  constructor(
    private readonly factory: ERPAdapterFactory,
    @Inject(ERP_REPOSITORY) private readonly repository: IERPRepository,
  ) {}

  async getConnectionAndAdapter(adapterCode: string) {
    const connectionInfo =
      await this.repository.findConnectionByAdapter(adapterCode);
    if (!connectionInfo) {
      // Default local connection fallback if none configured in database
      return {
        connectionInfo: { id: 'default_local', url: 'http://localhost:9000' },
        adapter: this.factory.getAdapter(adapterCode),
      };
    }

    return {
      connectionInfo,
      adapter: this.factory.getAdapter(connectionInfo.adapter.code),
    };
  }
}
