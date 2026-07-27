import { TallyClient } from '../src/tally-client';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TallyClient Integration', () => {
  let client: TallyClient;

  beforeEach(() => {
    client = new TallyClient('localhost', 9000, 5000);
    jest.clearAllMocks();
  });

  it('TEST 1: Tally unavailable yields DISCONNECTED', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('connect ECONNREFUSED 127.0.0.1:9000'));
    
    const res = await client.checkAvailability();
    expect(res.connected).toBe(false);
    expect(res.error).toBe('connect ECONNREFUSED 127.0.0.1:9000');
  });

  it('TEST 2: Axios receives valid Tally XML yields CONNECTED', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: `<ENVELOPE><STATUS>1</STATUS></ENVELOPE>`
    });

    const res = await client.checkAvailability();
    expect(res.connected).toBe(true);
    expect(res.responseTime).toBeDefined();
  });

  it('TEST 3: Ledger creation response STATUS=1 yields SUCCESS', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: `<ENVELOPE><STATUS>1</STATUS><CREATED>1</CREATED></ENVELOPE>`
    });

    const res = await client.createLedger({ name: 'Test', group: 'Sundry Debtors' });
    expect(res.success).toBe(true);
    expect(res.status).toBe('SUCCESS');
    expect(res.created).toBe(1);
  });

  it('TEST 4: Tally returns ERROR yields FAILED + captured message', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: `<ENVELOPE><LINEERROR>Ledger already exists</LINEERROR></ENVELOPE>`
    });

    const res = await client.createLedger({ name: 'Test', group: 'Sundry Debtors' });
    expect(res.success).toBe(false);
    expect(res.status).toBe('ERROR');
    expect(res.error).toBe('Ledger already exists');
  });

  it('TEST 5: Verification query yields actual verification result', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: `<ENVELOPE><BODY><DATA><COLLECTION><VOUCHER></VOUCHER></COLLECTION></DATA></BODY></ENVELOPE>`
    });

    const res = await client.verifyVoucher('VCH-123');
    expect(res.success).toBe(true);
    expect(res.exists).toBe(true);
  });
});
