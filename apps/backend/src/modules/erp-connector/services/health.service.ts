import { Injectable } from '@nestjs/common';
import { ERPConnectionManager } from './connection.manager';

@Injectable()
export class ERPHealthService {
  constructor(private readonly connectionManager: ERPConnectionManager) {}

  async checkHealth(adapterCode: string): Promise<boolean> {
    try {
      const { adapter } =
        await this.connectionManager.getConnectionAndAdapter(adapterCode);
      return await adapter.healthCheck();
    } catch {
      return false;
    }
  }
}
