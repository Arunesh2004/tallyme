import axios from 'axios';
import { XmlResponseParser, TallyResponse } from './xml/xml-response.parser';
import { QueryXmlBuilder } from './xml/query.xml.builder';
import { LedgerXmlBuilder, LedgerData } from './xml/ledger.xml.builder';
import { VoucherXmlBuilder, VoucherData } from './xml/voucher.xml.builder';

export class TallyClient {
  private parser: XmlResponseParser;

  constructor(
    private readonly tallyHost: string = process.env.TALLY_HOST || 'localhost',
    private readonly tallyPort: number = parseInt(process.env.TALLY_PORT || '9000'),
    private readonly timeoutMs: number = parseInt(process.env.TALLY_REQUEST_TIMEOUT || '10000')
  ) {
    this.parser = new XmlResponseParser();
  }

  private get tallyUrl() {
    return `http://${this.tallyHost}:${this.tallyPort}`;
  }

  async checkAvailability(): Promise<{ connected: boolean; company?: string; responseTime?: number; error?: string }> {
    const start = Date.now();
    try {
      const pingXml = QueryXmlBuilder.buildPingQuery();
      const response = await axios.post(this.tallyUrl, pingXml, {
        headers: { 'Content-Type': 'text/xml' },
        timeout: this.timeoutMs
      });
      
      const parsed = this.parser.parse(response.data);
      if (parsed.success) {
        return { connected: true, responseTime: Date.now() - start };
      } else {
         return { connected: false, error: parsed.error };
      }
    } catch (e: any) {
      return { connected: false, error: e.message || 'Connection refused' };
    }
  }

  async executeXml(xmlPayload: string): Promise<TallyResponse> {
    try {
      const response = await axios.post(this.tallyUrl, xmlPayload, {
        headers: { 'Content-Type': 'text/xml' },
        timeout: this.timeoutMs
      });
      return this.parser.parse(response.data);
    } catch (e: any) {
      return { success: false, status: 'FAILED', error: e.message || 'Network error', rawResponse: '' };
    }
  }

  async fetchCompanies(): Promise<TallyResponse> {
    // Basic ping represents if tally is open, can be expanded to fetch active company
    return this.executeXml(QueryXmlBuilder.buildPingQuery());
  }

  async fetchLedgers(): Promise<TallyResponse> {
    return this.executeXml(QueryXmlBuilder.buildLedgerQuery());
  }

  async createLedger(data: LedgerData): Promise<TallyResponse> {
    const xml = LedgerXmlBuilder.buildCreate(data);
    return this.executeXml(xml);
  }

  async createVoucher(data: VoucherData): Promise<TallyResponse> {
    const xml = VoucherXmlBuilder.buildCreate(data);
    return this.executeXml(xml);
  }

  async verifyVoucher(voucherId: string): Promise<{ success: boolean, exists: boolean }> {
    const xml = QueryXmlBuilder.buildVoucherVerifyQuery(voucherId);
    const res = await this.executeXml(xml);
    // If it returns DATA with collection, the voucher exists
    if (res.success && res.status === 'DATA') {
       return { success: true, exists: true };
    }
    return { success: res.success, exists: false };
  }
}
