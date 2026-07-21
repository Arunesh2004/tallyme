import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TallyTransport } from '../../shared/tally/TallyTransport';
import { TallyClient } from '../../shared/tally/TallyClient';
import { TallyConfig } from '../../shared/tally/config/TallyConfig';
import { ConnectionError, TimeoutError, XmlParseError } from '../../shared/tally/TallyError';
import { TallyVoucher } from '../../shared/tally/types/TallyDTOs';

// Mock global fetch
global.fetch = vi.fn();

describe('Tally Connector Integration', () => {
  let transport: TallyTransport;
  let client: TallyClient;

  const mockConfig: TallyConfig = {
    host: 'localhost',
    port: 9000,
    timeout: 1000,
    retryCount: 2,
    retryDelay: 10,
    keepAlive: false,
  };

  beforeEach(() => {
    vi.resetAllMocks();
    transport = new TallyTransport(mockConfig);
    client = new TallyClient(transport);
  });

  describe('Transport Layer', () => {
    it('should retry on connection failure', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new TypeError('fetch failed'));
      
      await expect(transport.send('<TEST/>')).rejects.toThrow(ConnectionError);
      expect(global.fetch).toHaveBeenCalledTimes(mockConfig.retryCount);
    });

    it('should throw TimeoutError on AbortError', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      vi.mocked(global.fetch).mockRejectedValue(abortError);

      await expect(transport.send('<TEST/>')).rejects.toThrow(TimeoutError);
    });

    it('should return text on successful response', async () => {
      const mockResponse = { ok: true, text: vi.fn().mockResolvedValue('<OK/>') } as any;
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      const result = await transport.send('<TEST/>');
      expect(result).toBe('<OK/>');
    });
  });

  describe('Tally Client Read Operations', () => {
    it('should parse company list successfully', async () => {
      const tallyResponse = `
        <ENVELOPE>
          <HEADER><STATUS>1</STATUS></HEADER>
          <BODY>
            <DATA>
              <COLLECTION>
                <COMPANY>
                  <NAME>Test Company</NAME>
                  <GUID>12345</GUID>
                  <BOOKSFROM>20230401</BOOKSFROM>
                </COMPANY>
              </COLLECTION>
            </DATA>
          </BODY>
        </ENVELOPE>
      `;
      
      const mockResponse = { ok: true, text: vi.fn().mockResolvedValue(tallyResponse) } as any;
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      const companies = await client.getCompany();
      expect(companies).toHaveLength(1);
      expect(companies[0].name).toBe('Test Company');
    });

    it('should throw XmlParseError on line error', async () => {
      const errorResponse = `
        <ENVELOPE>
          <HEADER><STATUS>0</STATUS></HEADER>
          <BODY>
            <DATA>
              <LINEERROR>Ledger does not exist</LINEERROR>
            </DATA>
          </BODY>
        </ENVELOPE>
      `;
      
      const mockResponse = { ok: true, text: vi.fn().mockResolvedValue(errorResponse) } as any;
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      await expect(client.getLedgers()).rejects.toThrow(XmlParseError);
    });
  });

  describe('Tally Client Write Operations', () => {
    it('should construct and send voucher XML', async () => {
      const mockResponse = { 
        ok: true, 
        text: vi.fn().mockResolvedValue('<ENVELOPE><HEADER><STATUS>1</STATUS></HEADER></ENVELOPE>') 
      } as any;
      vi.mocked(global.fetch).mockResolvedValue(mockResponse);

      const voucher: TallyVoucher = {
        date: '20230401',
        voucherType: 'Receipt',
        narration: 'Test Entry',
        ledgers: [
          { ledgerName: 'Cash', amount: '-100', isDeemedPositive: false },
          { ledgerName: 'Sales', amount: '100', isDeemedPositive: true }
        ]
      };

      const result = await client.createVoucher(voucher);
      expect(result.ENVELOPE.HEADER.STATUS).toBe(1);
      
      const calledXml = vi.mocked(global.fetch).mock.calls[0][1]?.body as string;
      expect(calledXml).toContain('<NARRATION>Test Entry</NARRATION>');
      expect(calledXml).toContain('<LEDGERNAME>Cash</LEDGERNAME>');
    });
  });
});
