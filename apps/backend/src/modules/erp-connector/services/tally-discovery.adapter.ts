import { Injectable, Logger } from '@nestjs/common';
import { IERPDiscoveryAdapter } from '../../accounting-intelligence/tally-discovery/tally-discovery.service';
import { TallyTransportService } from './transport.service';

@Injectable()
export class TallyDiscoveryAdapter implements IERPDiscoveryAdapter {
  private readonly logger = new Logger(TallyDiscoveryAdapter.name);

  constructor(private readonly transport: TallyTransportService) {}

  private buildExportRequest(type: string): string {
    return `<ENVELOPE>
      <HEADER>
        <TALLYREQUEST>Export Data</TALLYREQUEST>
      </HEADER>
      <BODY>
        <EXPORTDATA>
          <REQUESTDESC>
            <REPORTNAME>List of Accounts</REPORTNAME>
            <STATICVARIABLES>
              <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
              <ACCOUNTTYPE>${type}</ACCOUNTTYPE>
            </STATICVARIABLES>
          </REQUESTDESC>
        </EXPORTDATA>
      </BODY>
    </ENVELOPE>`;
  }

  private extractNames(xml: string, tag: string): string[] {
    const regex = new RegExp(`<${tag}[^>]*NAME="([^"]+)"`, 'gi');
    const names: string[] = [];
    let match;
    while ((match = regex.exec(xml)) !== null) {
      names.push(match[1]);
    }
    return names;
  }

  async fetchCompanies(): Promise<any[]> {
    try {
      const result = await this.transport.send(
        this.buildExportRequest('All Masters'),
        {
          voucherId: 'discovery-run',
          jobId: 'discovery-run',
        },
      );
      if (!result.success) return [];

      const match = /<SVCURRENTCOMPANY>([^<]+)<\/SVCURRENTCOMPANY>/i.exec(
        result.rawResponse,
      );
      if (match && match[1]) {
        return [{ name: match[1] }];
      }
      return [];
    } catch (error: any) {
      this.logger.warn(`Failed to fetch companies: ${(error as any).message}`);
      return [];
    }
  }

  async fetchGroups(): Promise<any[]> {
    try {
      const result = await this.transport.send(
        this.buildExportRequest('Groups'),
        {
          voucherId: 'discovery-run',
          jobId: 'discovery-run',
        },
      );
      if (!result.success) return [];
      const names = this.extractNames(result.rawResponse, 'GROUP');
      return names.map((name) => ({ name, data: { type: 'GROUP' } }));
    } catch (error: any) {
      this.logger.warn(`Failed to fetch groups: ${(error as any).message}`);
      return [];
    }
  }

  async fetchLedgers(): Promise<any[]> {
    try {
      const result = await this.transport.send(
        this.buildExportRequest('Ledgers'),
        {
          voucherId: 'discovery-run',
          jobId: 'discovery-run',
        },
      );
      if (!result.success) return [];
      const names = this.extractNames(result.rawResponse, 'LEDGER');
      return names.map((name) => ({ name, data: { type: 'LEDGER' } }));
    } catch (error: any) {
      this.logger.warn(`Failed to fetch ledgers: ${(error as any).message}`);
      return [];
    }
  }

  async fetchVoucherTypes(): Promise<any[]> {
    try {
      const result = await this.transport.send(
        this.buildExportRequest('Voucher Types'),
        {
          voucherId: 'discovery-run',
          jobId: 'discovery-run',
        },
      );
      if (!result.success) return [];
      const names = this.extractNames(result.rawResponse, 'VOUCHERTYPE');
      return names.map((name) => ({ name, data: { type: 'VOUCHERTYPE' } }));
    } catch (error: any) {
      this.logger.warn(
        `Failed to fetch voucher types: ${(error as any).message}`,
      );
      return [];
    }
  }

  async fetchCostCentres(): Promise<any[]> {
    try {
      const result = await this.transport.send(
        this.buildExportRequest('Cost Centres'),
        {
          voucherId: 'discovery-run',
          jobId: 'discovery-run',
        },
      );
      if (!result.success) return [];
      const names = this.extractNames(result.rawResponse, 'COSTCENTRE');
      return names.map((name) => ({ name, data: { type: 'COSTCENTRE' } }));
    } catch (error: any) {
      this.logger.warn(
        `Failed to fetch cost centres: ${(error as any).message}`,
      );
      return [];
    }
  }
}
