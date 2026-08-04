import { NarrationBuilder } from './narration.builder';

describe('NarrationBuilder', () => {
  let builder: NarrationBuilder;

  beforeEach(() => {
    builder = new NarrationBuilder();
  });

  describe('buildReceiptNarration', () => {
    it('should build with gateway and txn id', () => {
      const result = builder.buildReceiptNarration(
        {},
        { gateway: 'Stripe', transactionId: 'txn1' },
        { admissionNumber: 'A123' }
      );
      expect(result[0]).toBe('Fee received from Admission No. A123 via Stripe. Transaction ID: txn1.');
    });

    it('should build with unknown and N/A', () => {
      const result = builder.buildReceiptNarration(
        {},
        {},
        { admissionNumber: 'A123' }
      );
      expect(result[0]).toBe('Fee received from Admission No. A123 via Unknown. Transaction ID: N/A.');
    });
  });
});
