import { Test, TestingModule } from '@nestjs/testing';
import { VoucherMapperService } from './voucher-mapper.service';
import { ERPValidationException } from '../exceptions/erp-validation.exception';

describe('VoucherMapperService', () => {
  let service: VoucherMapperService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VoucherMapperService],
    }).compile();
    service = module.get<VoucherMapperService>(VoucherMapperService);
  });

  describe('mapToTransport', () => {
    const validData = {
      voucherNumber: 'V-001',
      date: '2024-01-01',
      voucherType: 'Purchase',
      companyId: 'comp-1',
      partyLedgerName: 'Vendor A',
      lines: [
        { ledgerName: 'Vendor A', isDebit: false, isParty: true, amount: 100 },
        { ledgerName: 'Office Expenses', isDebit: true, isParty: false, amount: 100 },
      ],
    };

    it('should map and return valid TallyVoucherDTO', () => {
      const result = service.mapToTransport(validData);
      expect(result.voucherNumber).toBe('V-001');
      expect(result.lines).toHaveLength(2);
      expect(result.lines[0].amount).toBe(100);
    });

    it('should format Date object to DD-MM-YYYY string', () => {
      const data = { ...validData, date: new Date('2024-01-15') };
      const result = service.mapToTransport(data);
      expect(result.date).toBe('15-01-2024');
    });

    it('should default voucherType to Receipt if not provided', () => {
      const data = { ...validData, voucherType: undefined };
      const result = service.mapToTransport(data);
      expect(result.voucherType).toBe('Receipt');
    });

    it('should include optional GST fields when provided', () => {
      const data = { ...validData, supplierGstin: '36AAAAA1234A1Z5', cgst: 9, sgst: 9 };
      const result = service.mapToTransport(data);
      expect(result.supplierGstin).toBe('36AAAAA1234A1Z5');
      expect(result.cgst).toBe(9);
      expect(result.sgst).toBe(9);
    });

    it('should include line-level inventory metadata', () => {
      const data = {
        ...validData,
        lines: [
          { ledgerName: 'Vendor A', isDebit: false, isParty: true, amount: 100 },
          { ledgerName: 'Item 1', isDebit: true, isParty: false, amount: 100, hsnCode: '8471', quantity: 5, unit: 'Nos', rate: 20 },
        ],
      };
      const result = service.mapToTransport(data);
      expect(result.lines[1].hsnCode).toBe('8471');
      expect(result.lines[1].quantity).toBe(5);
      expect(result.lines[1].rate).toBe(20);
    });

    it('should throw ERPValidationException if unbalanced', () => {
      const data = {
        ...validData,
        lines: [
          { ledgerName: 'Vendor A', isDebit: false, isParty: true, amount: 90 },
          { ledgerName: 'Office Expenses', isDebit: true, isParty: false, amount: 100 },
        ],
      };
      expect(() => service.mapToTransport(data)).toThrow(ERPValidationException);
      expect(() => service.mapToTransport(data)).toThrow('unbalanced');
    });

    it('should handle empty lines gracefully', () => {
      const data = { ...validData, lines: undefined };
      // Should not throw on empty lines (but may fail validation if lines are required)
      // We just ensure it doesn't crash the mapper itself
      try {
        service.mapToTransport(data);
      } catch (e: any) {
        expect(e).toBeInstanceOf(ERPValidationException);
      }
    });
  });
});
