// src/infrastructure/erp/tally/tally-idempotency.service.ts
import { Injectable } from '@nestjs/common';
import { ILogger } from '../../../shared/observability';
import { ERPConnector } from '../contracts';
import { VoucherCandidate } from '../../../modules/vendor-slip/domain/services/voucher.service';
import axios from 'axios';

@Injectable()
export class TallyIdempotencyService {
  constructor(private readonly logger: ILogger) {}

  async isVoucherAlreadySynced(
    candidateId: string,
    gatewayUrl: string,
  ): Promise<boolean> {
    this.logger.info(
      `Checking idempotency for Voucher ${candidateId} in Tally`,
    );
    // In Tally, we query the Gateway for a Voucher where NARRATION or a custom UDF matches our Candidate ID
    const queryXml = `
      <ENVELOPE>
        <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
        <BODY>
          <EXPORTDATA>
            <REQUESTDESC>
              <REPORTNAME>Voucher Register</REPORTNAME>
              <STATICVARIABLES>
                <SVVOUCHERTYPE>All Vouchers</SVVOUCHERTYPE>
              </STATICVARIABLES>
            </REQUESTDESC>
          </EXPORTDATA>
        </BODY>
      </ENVELOPE>
    `;

    try {
      // Stub HTTP request to Tally
      // const response = await axios.post(gatewayUrl, queryXml);
      // const xml = response.data;
      // return xml.includes(candidateId); // Parse XML for candidateId
      return false;
    } catch (e) {
      this.logger.error('Failed to query Tally for idempotency', e);
      throw e; // We MUST throw so BullMQ backs off, rather than risking a duplicate creation
    }
  }
}
