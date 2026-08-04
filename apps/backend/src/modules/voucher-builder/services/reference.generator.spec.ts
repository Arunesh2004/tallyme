import { ReferenceGenerator } from './reference.generator';

describe('ReferenceGenerator', () => {
  let generator: ReferenceGenerator;

  beforeEach(() => {
    generator = new ReferenceGenerator();
  });

  describe('generateVoucherNumber', () => {
    it('should generate prefix correctly', () => {
      const result = generator.generateVoucherNumber('RECEIPT');
      expect(result).toMatch(/^REC-\d{6}$/);
    });
  });

  describe('extractReferences', () => {
    it('should extract transactionId and utr', () => {
      const result = generator.extractReferences({ transactionId: 'txn1', utr: 'utr1' });
      expect(result).toEqual([
        { type: 'Transaction ID', value: 'txn1' },
        { type: 'UTR', value: 'utr1' },
      ]);
    });

    it('should extract nothing if missing', () => {
      const result = generator.extractReferences({});
      expect(result).toEqual([]);
    });
  });
});
