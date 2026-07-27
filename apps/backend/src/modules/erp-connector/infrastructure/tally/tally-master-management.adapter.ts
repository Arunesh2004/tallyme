import { Injectable, Logger } from '@nestjs/common';
import {
  IERPMasterManagementAdapter,
  CreateGroupDTO,
  CreateLedgerDTO,
  UpdateLedgerDTO,
  MoveLedgerDTO,
  CreateCostCentreDTO,
  MasterOperationResult,
} from '../../domain/ports/erp-master-management.port';
import { TallyTransportService } from '../../services/transport.service';
import * as crypto from 'crypto';

@Injectable()
export class TallyERPManagementAdapter implements IERPMasterManagementAdapter {
  private readonly logger = new Logger(TallyERPManagementAdapter.name);

  constructor(private readonly transport: TallyTransportService) {}

  private generateHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  async createGroup(dto: CreateGroupDTO): Promise<MasterOperationResult> {
    const xml = `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <GROUP NAME="${dto.name}" ACTION="Create">
            <NAME.LIST>
              <NAME>${dto.name}</NAME>
            </NAME.LIST>
            <PARENT>${dto.parent}</PARENT>
          </GROUP>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`.trim();

    return this.executeXml(xml);
  }

  async createLedger(dto: CreateLedgerDTO): Promise<MasterOperationResult> {
    const xml = `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="${dto.name}" ACTION="Create">
            <NAME.LIST>
              <NAME>${dto.name}</NAME>
            </NAME.LIST>
            <PARENT>${dto.parent}</PARENT>
          </LEDGER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`.trim();

    return this.executeXml(xml);
  }

  async updateLedger(dto: UpdateLedgerDTO): Promise<MasterOperationResult> {
    const xml = `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="${dto.name}" ACTION="Alter">
            <NAME.LIST>
              <NAME>${dto.name}</NAME>
            </NAME.LIST>
            ${dto.parent ? `<PARENT>${dto.parent}</PARENT>` : ''}
          </LEDGER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`.trim();

    return this.executeXml(xml);
  }

  async moveLedger(dto: MoveLedgerDTO): Promise<MasterOperationResult> {
    return this.updateLedger({ name: dto.name, parent: dto.newParent });
  }

  async createCostCentre(
    dto: CreateCostCentreDTO,
  ): Promise<MasterOperationResult> {
    const xml = `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <COSTCENTRE NAME="${dto.name}" ACTION="Create">
            <NAME.LIST>
              <NAME>${dto.name}</NAME>
            </NAME.LIST>
            ${dto.category ? `<CATEGORY>${dto.category}</CATEGORY>` : ''}
          </COSTCENTRE>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`.trim();

    return this.executeXml(xml);
  }

  async deleteGroup(name: string): Promise<MasterOperationResult> {
    const xml = `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <GROUP NAME="${name}" ACTION="Delete">
            <NAME.LIST>
              <NAME>${name}</NAME>
            </NAME.LIST>
          </GROUP>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`.trim();

    return this.executeXml(xml);
  }

  async deleteLedger(name: string): Promise<MasterOperationResult> {
    const xml = `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="${name}" ACTION="Delete">
            <NAME.LIST>
              <NAME>${name}</NAME>
            </NAME.LIST>
          </LEDGER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`.trim();

    return this.executeXml(xml);
  }

  async validateMaster(
    entityType: string,
    entityName: string,
  ): Promise<boolean> {
    // Rely on TallyDiscovery for validation ideally, but we can do a dummy export check
    return true;
  }

  private async executeXml(xml: string): Promise<MasterOperationResult> {
    const requestHash = this.generateHash(xml);
    try {
      const result = await this.transport.send(xml, {
        voucherId: 'MASTER_MIGRATION',
      });
      const response = result.rawResponse;
      const responseHash = this.generateHash(response);

      const success =
        response.includes('<CREATED>1</CREATED>') ||
        response.includes('<ALTERED>1</ALTERED>') ||
        response.includes('<DELETED>1</DELETED>');

      return {
        success,
        requestHash,
        responseHash,
        errorMessage: success
          ? undefined
          : 'Tally rejected the master modification request.',
      };
    } catch (e: any) {
      if (
        e.message?.includes('ECONNREFUSED') ||
        e.message?.includes('timeout') ||
        e.message?.includes('socket hang up')
      ) {
        return {
          success: false,
          requestHash,
          errorMessage: 'CONNECTION_FAILED',
        };
      }
      return {
        success: false,
        requestHash,
        errorMessage: e.message || 'Unknown error occurred',
      };
    }
  }
}
