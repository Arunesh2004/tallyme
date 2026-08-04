import { Test, TestingModule } from '@nestjs/testing';
import { TallyDiscoveryAdapter } from './tally-discovery.adapter';
import { TallyTransportService } from './transport.service';

describe('TallyDiscoveryAdapter', () => {
  let adapter: TallyDiscoveryAdapter;
  let transport: any;

  beforeEach(async () => {
    transport = {
      send: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TallyDiscoveryAdapter,
        { provide: TallyTransportService, useValue: transport },
      ],
    }).compile();

    adapter = module.get<TallyDiscoveryAdapter>(TallyDiscoveryAdapter);
  });

  const mockSuccess = (response: string) => {
    transport.send.mockResolvedValue({ success: true, rawResponse: response });
  };

  const mockFailure = () => {
    transport.send.mockResolvedValue({ success: false, rawResponse: '' });
  };

  describe('fetchCompanies', () => {
    it('should return companies on success', async () => {
      mockSuccess('<SVCURRENTCOMPANY>Acme Corp</SVCURRENTCOMPANY>');
      const res = await adapter.fetchCompanies();
      expect(res).toEqual([{ name: 'Acme Corp' }]);
    });

    it('should return empty on failure', async () => {
      mockFailure();
      const res = await adapter.fetchCompanies();
      expect(res).toEqual([]);
    });

    it('should catch exceptions and return empty', async () => {
      transport.send.mockRejectedValue(new Error('timeout'));
      const res = await adapter.fetchCompanies();
      expect(res).toEqual([]);
    });
  });

  describe('fetchGroups', () => {
    it('should return groups', async () => {
      mockSuccess('<GROUP NAME="Sundry Debtors"><NAME>Sundry Debtors</NAME></GROUP>');
      const res = await adapter.fetchGroups();
      expect(res).toEqual([{ name: 'Sundry Debtors', data: { type: 'GROUP' } }]);
    });

    it('should return empty on failure', async () => {
      transport.send.mockRejectedValue(new Error('timeout'));
      const res = await adapter.fetchGroups();
      expect(res).toEqual([]);
    });
  });

  describe('fetchLedgers', () => {
    it('should return ledgers', async () => {
      mockSuccess('<LEDGER NAME="Cash"><NAME>Cash</NAME></LEDGER>');
      const res = await adapter.fetchLedgers();
      expect(res).toEqual([{ name: 'Cash', data: { type: 'LEDGER' } }]);
    });

    it('should return empty on failure', async () => {
      transport.send.mockRejectedValue(new Error('timeout'));
      const res = await adapter.fetchLedgers();
      expect(res).toEqual([]);
    });
  });

  describe('fetchVoucherTypes', () => {
    it('should return voucher types', async () => {
      mockSuccess('<VOUCHERTYPE NAME="Sales"><NAME>Sales</NAME></VOUCHERTYPE>');
      const res = await adapter.fetchVoucherTypes();
      expect(res).toEqual([{ name: 'Sales', data: { type: 'VOUCHERTYPE' } }]);
    });

    it('should return empty on failure', async () => {
      transport.send.mockRejectedValue(new Error('timeout'));
      const res = await adapter.fetchVoucherTypes();
      expect(res).toEqual([]);
    });
  });

  describe('fetchCostCentres', () => {
    it('should return cost centres', async () => {
      mockSuccess('<COSTCENTRE NAME="Project A"><NAME>Project A</NAME></COSTCENTRE>');
      const res = await adapter.fetchCostCentres();
      expect(res).toEqual([{ name: 'Project A', data: { type: 'COSTCENTRE' } }]);
    });

    it('should return empty on failure', async () => {
      transport.send.mockRejectedValue(new Error('timeout'));
      const res = await adapter.fetchCostCentres();
      expect(res).toEqual([]);
    });
  });
});
