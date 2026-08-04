import { Test, TestingModule } from '@nestjs/testing';
import { TallyXmlBuilderService } from './xml-builder.service';
import { ConfigCompanyResolver } from './company-resolver.service';
import { TallyVoucherDTO } from '../dto/tally-voucher.dto';

describe('TallyXmlBuilderService', () => {
  let service: TallyXmlBuilderService;
  let companyResolver: any;

  beforeEach(async () => {
    companyResolver = {
      resolveCompanyName: jest.fn().mockResolvedValue('Acme Corp'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TallyXmlBuilderService,
        { provide: ConfigCompanyResolver, useValue: companyResolver },
      ],
    }).compile();

    service = module.get<TallyXmlBuilderService>(TallyXmlBuilderService);
  });

  describe('buildVoucherXml', () => {
    it('should build valid XML for standard voucher', async () => {
      const voucher: TallyVoucherDTO = {
        voucherNumber: 'V-123',
        guid: 'test-guid',
        voucherType: 'Purchase',
        companyId: 'comp-1',
        date: '2023-01-01',
        partyLedgerName: 'Vendor A',
        lines: [
          { ledgerName: 'Vendor A', amount: 100, isDebit: false, isParty: true },
          { ledgerName: 'Office Expenses', amount: 100, isDebit: true, isParty: false },
        ],
      };
      const xml = await service.buildVoucherXml(voucher);
      expect(xml).toContain('<VOUCHERNUMBER>V-123</VOUCHERNUMBER>');
      expect(xml).toContain('<LEDGERNAME>Vendor A</LEDGERNAME>');
      expect(xml).toContain('<LEDGERNAME>Office Expenses</LEDGERNAME>');
      expect(xml).toContain('<GUID>test-guid</GUID>');
    });

    it('should throw if voucher unbalanced', async () => {
      const voucher: TallyVoucherDTO = {
        voucherNumber: 'V-123',
        voucherType: 'Purchase',
        companyId: 'comp-1',
        date: '2023-01-01',
        partyLedgerName: 'Vendor A',
        lines: [
          { ledgerName: 'Vendor A', amount: 90, isDebit: false, isParty: true },
          { ledgerName: 'Office Expenses', amount: 100, isDebit: true, isParty: false },
        ],
      };
      await expect(service.buildVoucherXml(voucher)).rejects.toThrow('unbalanced');
    });

    it('should throw if missing voucher number', async () => {
      const voucher: TallyVoucherDTO = {
        voucherNumber: '',
        voucherType: 'Purchase',
        companyId: 'comp-1',
        date: '2023-01-01',
        partyLedgerName: 'Vendor A',
        lines: [],
      };
      await expect(service.buildVoucherXml(voucher)).rejects.toThrow('missing');
    });

    it('should build inventory xml if quantities are present', async () => {
      const voucher: TallyVoucherDTO = {
        voucherNumber: 'V-123',
        voucherType: 'Purchase',
        companyId: 'comp-1',
        date: '2023-01-01',
        partyLedgerName: 'Vendor A',
        lines: [
          { ledgerName: 'Vendor A', amount: 100, isDebit: false, isParty: true },
          { ledgerName: 'Item 1', amount: 100, isDebit: true, quantity: 10, unit: 'Nos', isParty: false },
        ],
      };
      const xml = await service.buildVoucherXml(voucher);
      expect(xml).toContain('<INVENTORYENTRIES.LIST>');
      expect(xml).toContain('<STOCKITEMNAME>Item 1</STOCKITEMNAME>');
      expect(xml).toContain('10 Nos');
    });

    it('should include GST and Invoice details', async () => {
      const voucher: TallyVoucherDTO = {
        voucherNumber: 'V-123',
        voucherType: 'Purchase',
        companyId: 'comp-1',
        date: '2023-01-01',
        supplierGstin: '36AAAAA1234A1Z5',
        supplierState: 'Telangana',
        placeOfSupply: 'Telangana',
        invoiceNumber: 'INV-001',
        purchaseOrder: 'PO-001',
        paymentTerms: 'Net 30',
        lines: [
          { ledgerName: 'Vendor A', amount: 100, isDebit: false, isParty: true },
          { ledgerName: 'Office Expenses', amount: 100, isDebit: true, isParty: false },
        ],
      };
      const xml = await service.buildVoucherXml(voucher);
      expect(xml).toContain('<PARTYGSTIN>36AAAAA1234A1Z5</PARTYGSTIN>');
      expect(xml).toContain('<STATENAME>Telangana</STATENAME>');
      expect(xml).toContain('<REFERENCE>INV-001</REFERENCE>');
      expect(xml).toContain('<ORDERNO>PO-001</ORDERNO>');
      expect(xml).toContain('<PAYMENTTERMS>Net 30</PAYMENTTERMS>');
    });
  });

  describe('buildExportXml', () => {
    it('should build valid export xml with criteria', async () => {
      const xml = await service.buildExportXml({
        voucherNumber: 'V-123',
        voucherType: 'Purchase',
        guid: 'guid-123',
        masterId: '1001',
        externalInvoiceNumber: 'INV-123',
        partyLedger: 'Vendor A',
      }, 'comp-1');

      expect(xml).toContain('<VOUCHERNO>V-123</VOUCHERNO>');
      expect(xml).toContain('<VOUCHERTYPENAME>Purchase</VOUCHERTYPENAME>');
      expect(xml).toContain('<GUID>guid-123</GUID>');
      expect(xml).toContain('<MASTERID>1001</MASTERID>');
      expect(xml).toContain('<INVOICENO>INV-123</INVOICENO>');
      expect(xml).toContain('<LEDGERNAME>Vendor A</LEDGERNAME>');
    });
  });
});
