import { Test, TestingModule } from '@nestjs/testing';
import { TallyMasterIntelligenceService } from './tally-master-intelligence.service';
import { TallyTransportService } from './transport.service';
import { TallyMasterXmlBuilder } from './tally-master-xml.builder';

describe('TallyMasterIntelligenceService', () => {
  let service: TallyMasterIntelligenceService;
  let transport: any;
  let xmlBuilder: any;

  beforeEach(async () => {
    transport = {
      send: jest.fn(),
    };
    xmlBuilder = {
      buildReadLedgersXml: jest.fn().mockResolvedValue('<read/>'),
      buildCreateGroupXml: jest.fn().mockResolvedValue('<createGroup/>'),
      buildCreateLedgerXml: jest.fn().mockResolvedValue('<createLedger/>'),
      buildCreateCostCategoryXml: jest.fn().mockResolvedValue('<createCostCat/>'),
      buildCreateCostCentreXml: jest.fn().mockResolvedValue('<createCostCentre/>'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TallyMasterIntelligenceService,
        { provide: TallyTransportService, useValue: transport },
        { provide: TallyMasterXmlBuilder, useValue: xmlBuilder },
      ],
    }).compile();

    service = module.get<TallyMasterIntelligenceService>(TallyMasterIntelligenceService);
  });

  describe('loadMasters', () => {
    it('should load masters from Tally response', async () => {
      transport.send.mockResolvedValue({
        rawResponse: '<ENVELOPE><NAME>Cash</NAME><NAME>Vendor A</NAME></ENVELOPE>',
      });
      await service.loadMasters();
      expect(transport.send).toHaveBeenCalledTimes(1);
    });

    it('should not fetch again if already loaded', async () => {
      transport.send.mockResolvedValue({ rawResponse: '<ENVELOPE><NAME>Cash</NAME></ENVELOPE>' });
      await service.loadMasters();
      await service.loadMasters(); // second call — should be cached
      expect(transport.send).toHaveBeenCalledTimes(1);
    });

    it('should handle transport errors gracefully', async () => {
      transport.send.mockRejectedValue(new Error('Connection refused'));
      await expect(service.loadMasters()).resolves.not.toThrow();
    });
  });

  describe('checkLedgerExistence', () => {
    it('should return true if ledger is known', async () => {
      transport.send.mockResolvedValue({ rawResponse: '<NAME>Cash</NAME>' });
      const result = await service.checkLedgerExistence('Cash');
      expect(result).toBe(true);
    });

    it('should return false if ledger is unknown', async () => {
      transport.send.mockResolvedValue({ rawResponse: '<NAME>Cash</NAME>' });
      const result = await service.checkLedgerExistence('Unknown Ledger');
      expect(result).toBe(false);
    });
  });

  describe('checkGroupExistence', () => {
    it('should return true if group is known', async () => {
      transport.send.mockResolvedValue({ rawResponse: '<NAME>Sundry Creditors</NAME>' });
      const result = await service.checkGroupExistence('Sundry Creditors');
      expect(result).toBe(true);
    });
  });

  describe('ensureGroup', () => {
    it('should skip creation if group already exists', async () => {
      transport.send.mockResolvedValue({ rawResponse: '<NAME>Sundry Creditors</NAME>' });
      await service.ensureGroup('Sundry Creditors');
      expect(xmlBuilder.buildCreateGroupXml).not.toHaveBeenCalled();
    });

    it('should create group if missing and Tally returns CREATED=1', async () => {
      // First call for loadMasters returns empty
      transport.send
        .mockResolvedValueOnce({ rawResponse: '' })
        .mockResolvedValueOnce({ rawResponse: '<CREATED>1</CREATED>' });

      await service.ensureGroup('New Group', 'Sundry Creditors');
      expect(xmlBuilder.buildCreateGroupXml).toHaveBeenCalled();
    });

    it('should handle already exists response', async () => {
      transport.send
        .mockResolvedValueOnce({ rawResponse: '' })
        .mockResolvedValueOnce({ rawResponse: 'already exists' });

      await expect(service.ensureGroup('New Group')).resolves.not.toThrow();
    });

    it('should throw if group creation fails', async () => {
      transport.send
        .mockResolvedValueOnce({ rawResponse: '' })
        .mockResolvedValueOnce({ rawResponse: '<ERROR>Something went wrong</ERROR>' });

      await expect(service.ensureGroup('Bad Group')).rejects.toThrow('Tally Group creation failed');
    });
  });

  describe('ensureLedger', () => {
    it('should skip creation if ledger already exists', async () => {
      transport.send.mockResolvedValue({ rawResponse: '<NAME>Cash</NAME>' });
      await service.ensureLedger('Cash', 'Cash In Hand');
      expect(xmlBuilder.buildCreateLedgerXml).not.toHaveBeenCalled();
    });

    it('should create ledger if missing and Tally returns ALTERED=1', async () => {
      transport.send
        .mockResolvedValueOnce({ rawResponse: '' })
        .mockResolvedValueOnce({ rawResponse: '<ALTERED>1</ALTERED>' });

      await service.ensureLedger('New Ledger', 'Sundry Creditors');
      expect(xmlBuilder.buildCreateLedgerXml).toHaveBeenCalled();
    });

    it('should throw if ledger creation fails', async () => {
      transport.send
        .mockResolvedValueOnce({ rawResponse: '' })
        .mockResolvedValueOnce({ rawResponse: '<ERROR>Validation failed</ERROR>' });

      await expect(service.ensureLedger('Bad Ledger', 'Group')).rejects.toThrow('Tally Ledger creation failed');
    });
  });
});
